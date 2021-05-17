import * as React from 'react';
import { icon } from '../utils/icon';
import { faDesktop, faArrowsAltH } from '@fortawesome/free-solid-svg-icons';
import moment from 'moment';
import { parseTimestamp } from '../utils/datetime';
import { timestampToLongDate } from '../locale/date';
import { X_TICK_SPACE } from './Graph';
import { dataWorker } from '..';
import { DispatchProps, edit_graph, graph_threshold_select } from '../redux';
import { connect } from 'react-redux';

const COMPACT_RADIUS = 16;
let GLOBAL_RULER: RulerData | undefined = undefined;

const dispatchProps = {
    graph_threshold_select,
    edit_graph,
};

const stateProps = (state: RootStore, props: Pick<Graph, 'id'>) => ({
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    ...(state.graphs.items.find(g => g.id === props.id)!),
    threshold: state.graphs.threshold,
});

export interface Props extends Graph, DispatchProps<typeof dispatchProps> {
    threshold: boolean,
    
    xTicks: { pos: number, val: number }[];
    yTicks: { pos: number, val: number }[];
    zoomRecommendation: Promise<Graph['zoom']> | undefined;

    width: number;
    height: number;

    onContextMenu(e: React.MouseEvent<HTMLCanvasElement>): void,
}

export interface State {
}

class GraphGui extends React.Component<Props, State> {
    private guiCanvasRef= React.createRef<HTMLCanvasElement>();

    public componentDidMount() {
        window.addEventListener('mouseup', this.canvasMouseUp);
        requestAnimationFrame(this.drawGui);

        const canvas = this.guiCanvasRef.current;
        if (canvas) {
            canvas.width = canvas.clientWidth;
            canvas.height = canvas.clientHeight;
        }
    }

    public componentWillUnmount() {
        window.removeEventListener('mouseup', this.canvasMouseUp);
        cancelAnimationFrame(this.drawFrame);
    }

    private graphArea = () => {
        if (!this.guiCanvasRef.current) return [0, 0];

        const { margin, xLabelSpace, yLabelSpace } = this.props.style;

        return [
            this.guiCanvasRef.current.width  - 2 * margin  - yLabelSpace,
            this.guiCanvasRef.current.height - 2 * margin - xLabelSpace - X_TICK_SPACE
        ];
    };

    private drawFrame = 0;
    public drawGui = () => {
        this.drawFrame = window.requestAnimationFrame(this.drawGui);

        const ruler = GLOBAL_RULER;
        const { zoom } = this.props;
        const { margin, xLabelSpace, yLabelSpace } = this.props.style;
        const ctxt = this.guiCanvasRef.current?.getContext('2d');
        const area = this.graphArea();

        const pos = this.currentPos ? [ ...this.currentPos ] : undefined;

        function drawPad(ctxt: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number) {
            ctxt.save();
            ctxt.lineWidth = 2;
            ctxt.beginPath();
            ctxt.moveTo(fromX + margin + yLabelSpace, fromY + margin);
            ctxt.lineTo(toX + margin + yLabelSpace, toY + margin);
            ctxt.stroke();
            ctxt.restore();
        }

        if (ctxt) {
            ctxt.clearRect(0, 0, ctxt.canvas.width, ctxt.canvas.height);

            if (this.props.threshold && pos) {
                ctxt.beginPath();
                ctxt.moveTo(margin + yLabelSpace, pos[1] + margin);
                ctxt.lineTo(ctxt.canvas.width - margin - 1, pos[1] + margin);
                ctxt.stroke();
            } else if (this.downPos && pos) {
                const start = [ ...this.downPos ];

                const compactX = Math.abs(pos[0] - start[0]) < COMPACT_RADIUS;
                const compactY = Math.abs(pos[1] - start[1]) < COMPACT_RADIUS;

                if (compactX && compactY) return;

                if (compactY) {
                    start[1] = 0;
                    pos[1] = ctxt.canvas.clientHeight - 2 * margin - xLabelSpace - X_TICK_SPACE;
                } else if (compactX) {
                    start[0] = 0;
                    pos[0] = ctxt.canvas.clientWidth - 2 * margin - yLabelSpace;
                }

                const rect = {
                    x: Math.min(pos[0], start[0]) + margin + yLabelSpace,
                    y: Math.min(pos[1], start[1]) + margin,
                    width:  Math.abs(pos[0] - start[0]),
                    height: Math.abs(pos[1] - start[1])
                };

                ctxt.save();
                if (this.shiftDown) { ctxt.strokeStyle = 'orange'; }
                ctxt.beginPath();
                ctxt.setLineDash([5, 5]);
                ctxt.strokeRect(rect.x, rect.y, rect.width, rect.height);
                ctxt.stroke();
                ctxt.restore();

                if (compactY) {
                    start[1] = this.downPos[1];
                    drawPad(ctxt, start[0], start[1] - COMPACT_RADIUS, start[0], start[1] + COMPACT_RADIUS);
                    drawPad(ctxt, pos[0],   start[1] - COMPACT_RADIUS, pos[0],   start[1] + COMPACT_RADIUS);
                } else if (compactX) {
                    start[0] = this.downPos[0];
                    drawPad(ctxt, start[0] - COMPACT_RADIUS, start[1], start[0] + COMPACT_RADIUS, start[1]);
                    drawPad(ctxt, start[0] - COMPACT_RADIUS, pos[1],   start[0] + COMPACT_RADIUS, pos[1]);
                }
            } else if (ruler && zoom && ruler.xType === this.props.xType && ruler.value >= zoom[0] && ruler.value <= zoom[1]) {
                const relRulerPos = (ruler.value - zoom[0]) / (zoom[1] - zoom[0]);
                const absRulerPos = margin + yLabelSpace + relRulerPos * area[0];

                ctxt.save();
                ctxt.setLineDash([ 4, 12 ]);
                ctxt.beginPath();
                ctxt.moveTo(absRulerPos, margin);
                ctxt.lineTo(absRulerPos, margin + area[1]);
                ctxt.stroke();
                ctxt.restore();
            }
        }
    }

    private positionInGraphSpace = (e: { clientX: number, clientY: number }, clamp = false): [ number, number ] | undefined => {
        const rect = this.guiCanvasRef.current?.getBoundingClientRect();
        if (!rect) return undefined;

        const { margin, yLabelSpace } = this.props.style;

        const [ areaWidth, areaHeight ] = this.graphArea();
        const pos: [number, number] = [ e.clientX - rect.x - margin - yLabelSpace, e.clientY - rect.y - margin ];

        function clampf(val: number, from: number, to: number) { return Math.max(Math.min(val, to), from); }

        if (clamp) {
            return [ clampf(pos[0], 0, areaWidth), clampf(pos[1], 0, areaHeight) ];
        }

        if (pos[0] >= 0 && pos[1] >= 0 &&
            pos[0] < areaWidth &&
            pos[1] < areaHeight) {

            return pos;
        }

        return undefined;
    }

    private downPos?: [number, number] = undefined;
    private currentPos: [number, number] | undefined = undefined;
    private shiftDown = false;

    private canvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (this.props.threshold) {
            if (!this.guiCanvasRef.current) return;

            const pos = this.positionInGraphSpace(e);
            const zoom = this.props.zoom as number[] | undefined;
            const area = this.graphArea();

            if (!pos || !zoom) return;

            const yVal = zoom[3] - (pos[1] / area[1]) * (zoom[3] - zoom[2]);

            this.props.graph_threshold_select({ id: this.props.id, threshold: yVal });
        } else {
            e.preventDefault();
            this.downPos = this.positionInGraphSpace(e);
        }
    };

    private canvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const pos = this.positionInGraphSpace(e, true);
        this.shiftDown = e.shiftKey;

        if (pos && this.props.zoom) {
            this.currentPos = pos;
            const { zoom, xType } = this.props;
            const area = this.graphArea();

            GLOBAL_RULER = { xType, value: zoom[0] + (zoom[1] - zoom[0]) * pos[0] / area[0] };
            console.count('lol');
        }
    }

    private canvasMouseUp = (e: MouseEvent) => {
        if (this.downPos && this.guiCanvasRef.current) {
            const pos = this.positionInGraphSpace(e, true);
            const start = [ ...this.downPos ];

            if (pos && this.props.zoom) {
                const zoom = this.props.zoom as number[];

                const area = this.graphArea();

                const compactX = Math.abs(pos[0] - start[0]) < COMPACT_RADIUS;
                const compactY = Math.abs(pos[1] - start[1]) < COMPACT_RADIUS;

                if (!compactX || !compactY) {
                    const [ relXS, relXE, relYS, relYE ] = [
                        compactX ? 0 : Math.min(this.downPos[0], pos[0]) / area[0],
                        compactX ? 1 : Math.max(this.downPos[0], pos[0]) / area[0],
                        compactY ? 0 : 1.0 - (Math.max(this.downPos[1], pos[1]) / area[1]),
                        compactY ? 1 : 1.0 - (Math.min(this.downPos[1], pos[1]) / area[1])
                    ];

                    if (compactY && e.shiftKey) {
                        dataWorker.recommend_extents(
                            zoom[0] + relXS * (zoom[1] - zoom[0]),
                            zoom[0] + relXE * (zoom[1] - zoom[0]),
                            this.props.traces.filter(t => t.active).map(t => t.handle)
                        ).then(zoom => {
                            this.props.edit_graph({ id: this.props.id, zoom });
                        });
                    } else {
                        this.props.edit_graph({ id: this.props.id, zoom: [
                            zoom[0] + relXS * (zoom[1] - zoom[0]),
                            zoom[0] + relXE * (zoom[1] - zoom[0]),
                            zoom[2] + relYS * (zoom[3] - zoom[2]),
                            zoom[2] + relYE * (zoom[3] - zoom[2])
                        ] });
                    }
                }
            }

            this.downPos = undefined;
        }
    };

    private canvasMouseLeave = () => {
        GLOBAL_RULER = undefined;
    }

    private canvasDoubleClick = async () => {
        // const ids = this.props.traces.filter(t => t.active).map(t => t.id);
        const { zoomRecommendation } = this.props;
        const [ from, to ] = this.props.xRange;

        const zoom = zoomRecommendation ? await zoomRecommendation : [ from, to, 0.0, 1.0 ] as Graph['zoom'];

        this.props.edit_graph({
            id: this.props.id,
            zoom
        });
    }

    private getXTickString = (val: number) => {
        if (this.props.xType === 'datetime') {
            return moment(parseTimestamp(val)).format('DD.MM. hh:mm');
        } else {
            return val.toString();
        }
    }

    private getYTickString = (val: number) => {
        return val.toString();
    }

    public render() {
        const { xLabel, yLabel, xTicks, yTicks, xRange, metadata, onContextMenu } = this.props;
        const { margin, xLabelSpace, yLabelSpace } = this.props.style;

        return (
            <>
                <canvas
                    ref={this.guiCanvasRef}
                    hidden={this.props.traces.length <= 0}
                    onMouseDown={this.canvasMouseDown}
                    onMouseMove={this.canvasMouseMove}
                    onMouseLeave={this.canvasMouseLeave}
                    onDoubleClick={this.canvasDoubleClick}
                    onContextMenu={onContextMenu}

                    width={this.props.width}
                    height={this.props.height}
                />
                <div className='graph-details'>
                    { icon(faDesktop)   }{ metadata.sourceNames.join('; ') } <br/>
                    { icon(faArrowsAltH) }{ timestampToLongDate(xRange[0]) } – { timestampToLongDate(xRange[1]) }
                </div>
                <div className='xlabel' style={{ left: margin + yLabelSpace, right: margin, maxHeight: xLabelSpace }}>{xLabel}</div>
                <div className='xticks' style={{ width: `calc(100% - ${2 * margin + yLabelSpace}px)`, top: `calc(100% - ${margin + xLabelSpace + X_TICK_SPACE}px)`, left: margin + yLabelSpace}}>
                    {xTicks.map((tick, i) => (
                        <span className='tick' style={{ left: `${100 * tick.pos}%` }} key={i}>{this.getXTickString(tick.val)}</span>
                    ))}
                </div>
                <div className='ylabel' style={{ height: `calc(100% - ${2 * margin + xLabelSpace + X_TICK_SPACE}px)`, maxWidth: '1.8em', top: margin, whiteSpace: 'nowrap' }}>
                    <span style={{ transform: 'rotate(-90deg)' }} >{yLabel}</span>
                </div>
                <div className='yticks' style={{ height: `calc(100% - ${2 * margin + xLabelSpace + X_TICK_SPACE}px)`, top: margin, right: `calc(100% - ${margin + yLabelSpace}px)`}}>
                    {yTicks.map((tick, i) => (
                        <span className='tick' style={{ bottom: `${100 * tick.pos}%` }} key={i}>{this.getYTickString(tick.val)}</span>
                    ))}
                </div>
            </>
        );
    }
}

export default connect(stateProps, dispatchProps)(GraphGui);