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
import * as position from '../utils/position';
import * as canvas from '../utils/canvas';

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

export interface State { }

type InputData = {
    ctrl: boolean,
    alt: boolean,
    shift: boolean,

    down: {
        action: 'zoom' | 'shiftX' | 'shiftY',
        pos: [ number, number ],
    } | undefined,
    pos: [ number, number ],
}

class GraphGui extends React.Component<Props, State> {
    private canvasRef = React.createRef<HTMLCanvasElement>();
    private xTicksRef = React.createRef<HTMLDivElement>();
    private yTicksRef = React.createRef<HTMLDivElement>();

    public componentDidMount() {
        window.addEventListener('mousemove', this.canvasMouseMove);
        window.addEventListener('mouseup', this.canvasMouseUp);
        window.addEventListener('keyup', this.canvasKeyChange);
        window.addEventListener('keydown', this.canvasKeyChange);
        requestAnimationFrame(this.drawGui);
    }

    public componentWillUnmount() {
        window.removeEventListener('mousemove', this.canvasMouseMove);
        window.removeEventListener('mouseup', this.canvasMouseUp);
        window.removeEventListener('keyup', this.canvasKeyChange);
        window.removeEventListener('keydown', this.canvasKeyChange);
        cancelAnimationFrame(this.drawFrame);
    }

    private drawFrame = 0;
    public drawGui = () => {
        this.drawFrame = window.requestAnimationFrame(this.drawGui);

        const ctxt = this.canvasRef.current?.getContext('2d');
        if (!ctxt) return;

        const ruler = GLOBAL_RULER;
        const { zoom } = this.props;
        const { margin, xLabelSpace, yLabelSpace } = this.props.style;
        const innerBox = this.innerGraphBox();

        function drawPad(ctxt: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number) {
            ctxt.save();
            ctxt.lineWidth = 2;
            ctxt.beginPath();
            ctxt.moveTo(fromX + margin + yLabelSpace, fromY + margin);
            ctxt.lineTo(toX + margin + yLabelSpace, toY + margin);
            ctxt.stroke();
            ctxt.restore();
        }

        ctxt.clearRect(0, 0, ctxt.canvas.width, ctxt.canvas.height);

        if (this.props.threshold) {
            const pos = position.getPosIn(innerBox, this.input.pos, true);

            pos && canvas.drawSegment(ctxt,
                [ margin + yLabelSpace, pos[1] + margin ],
                [ ctxt.canvas.width - margin - 1, pos[1] + margin ]
            );
            return;
        }

        if (this.input.down)
        {
            const { action } = this.input.down;

            if (action === 'zoom') {
                const pos = position.getPosIn(innerBox, this.input.pos, true);
                const downPos = position.getPosIn(innerBox, this.input.down.pos);
                if (!pos || !downPos) return;
                
                const start = [ ...downPos ];

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
                if (this.input.shift) { ctxt.strokeStyle = 'orange'; }
                ctxt.beginPath();
                ctxt.setLineDash([5, 5]);
                ctxt.strokeRect(rect.x, rect.y, rect.width, rect.height);
                ctxt.stroke();
                ctxt.restore();
    
                if (compactY) {
                    start[1] = downPos[1];
                    drawPad(ctxt, start[0], start[1] - COMPACT_RADIUS, start[0], start[1] + COMPACT_RADIUS);
                    drawPad(ctxt, pos[0],   start[1] - COMPACT_RADIUS, pos[0],   start[1] + COMPACT_RADIUS);
                } else if (compactX) {
                    start[0] = downPos[0];
                    drawPad(ctxt, start[0] - COMPACT_RADIUS, start[1], start[0] + COMPACT_RADIUS, start[1]);
                    drawPad(ctxt, start[0] - COMPACT_RADIUS, pos[1],   start[0] + COMPACT_RADIUS, pos[1]);
                }

                return;
            } else if (action === 'shiftX') {
                const outerBox = this.outerGraphBox();
                const xTicksBox = this.xTicksBox();

                const pos = position.getPosIn(xTicksBox, this.input.pos);
                const downPos = position.getPosIn(xTicksBox, this.input.down.pos);

                downPos && canvas.drawSegment(ctxt,
                    [ downPos[0] + xTicksBox.x - outerBox.x, xTicksBox.y - outerBox.y ],
                    [ downPos[0] + xTicksBox.x - outerBox.x, xTicksBox.y - outerBox.y + xTicksBox.height ],
                    {
                        strokeStyle: 'green',
                    }
                );

                pos && canvas.drawSegment(ctxt,
                    [ pos[0] + xTicksBox.x - outerBox.x, xTicksBox.y - outerBox.y ],
                    [ pos[0] + xTicksBox.x - outerBox.x, xTicksBox.y - outerBox.y + xTicksBox.height ],
                    {
                        strokeStyle: 'green',
                    }
                );

                return;
            } else if (action === 'shiftY') {
                const outerBox = this.outerGraphBox();
                const yTicksBox = this.yTicksBox();

                const pos = position.getPosIn(yTicksBox, this.input.pos);
                const downPos = position.getPosIn(yTicksBox, this.input.down.pos);

                downPos && canvas.drawSegment(ctxt,
                    [ yTicksBox.x - outerBox.x, downPos[1] + yTicksBox.y - outerBox.y ],
                    [ yTicksBox.x - outerBox.x + yTicksBox.width, downPos[1] + yTicksBox.y - outerBox.y ],
                    {
                        strokeStyle: 'green',
                    }
                );

                pos && canvas.drawSegment(ctxt,
                    [ yTicksBox.x - outerBox.x, pos[1] + yTicksBox.y - outerBox.y ],
                    [ yTicksBox.x - outerBox.x + yTicksBox.width, pos[1] + yTicksBox.y - outerBox.y ],
                    {
                        strokeStyle: 'green',
                    }
                );

                return;
            }
        }
        

        if (ruler && zoom && ruler.xType === this.props.xType && ruler.value >= zoom[0] && ruler.value <= zoom[1]) {
            const relRulerPos = (ruler.value - zoom[0]) / (zoom[1] - zoom[0]);
            const absRulerPos = margin + yLabelSpace + relRulerPos * innerBox.width;

            ctxt.save();
            ctxt.setLineDash([ 4, 12 ]);
            ctxt.beginPath();
            ctxt.moveTo(absRulerPos, margin);
            ctxt.lineTo(absRulerPos, margin + innerBox.height);
            ctxt.stroke();
            ctxt.restore();
        }
    }

    private outerGraphBox = () => {
        const rect = this.canvasRef.current?.getBoundingClientRect();
        return rect ?? { x: 0, y: 0, width: 0, height: 0 };
    }

    private innerGraphBox = () => {
        const rect = this.canvasRef.current?.getBoundingClientRect();
        const { xLabelSpace, yLabelSpace, margin } = this.props.style;

        if (rect) {
            return {
                x: rect.x + yLabelSpace + margin,
                y: rect.y + margin,
                width:  rect.width  - 2 * margin - yLabelSpace,
                height: rect.height - 2 * margin - xLabelSpace - X_TICK_SPACE
            };
        }

        return { x: 0, y: 0, width: 0, height: 0 };
    }

    private xTicksBox = () => {
        const rect = this.xTicksRef.current?.getBoundingClientRect();
        return rect ?? { x: 0, y: 0, width: 0, height: 0 };
    }

    private yTicksBox = () => {
        const rect = this.yTicksRef.current?.getBoundingClientRect();
        return rect ?? { x: 0, y: 0, width: 0, height: 0 };
    }

    private input: InputData  = {
        ctrl: false,
        alt: false,
        shift: false,

        down: undefined,
        pos: [ 0, 0 ],
    }

    private eventToInputData = (prev: InputData, e: Pick<MouseEvent, 'ctrlKey' | 'altKey' | 'shiftKey' | 'clientX' | 'clientY'>, type: 'down-shiftX' | 'down-shiftY' | 'down-zoom' | 'up' | 'move'): InputData => {
        const pos: [number, number] = [ e.clientX, e.clientY ];
        let down: InputData['down'] = undefined;

        switch (type) {
            case 'down-shiftX':
                down = {
                    action: 'shiftX',
                    pos: [ ...pos ],  
                };
                break;
            case 'down-shiftY':
                down = {
                    action: 'shiftY',
                    pos: [ ...pos ],  
                };
                break;
            case 'down-zoom':
                down = {
                    action: 'zoom',
                    pos: [ ...pos ],  
                };
                break;
            case 'move':
                down = prev.down;
                break;
        }

        const ret: InputData = {
            ...prev,

            ctrl: e.ctrlKey,
            alt: e.altKey,
            shift: e.shiftKey,

            down,
            pos,
        };

        return ret;
    }

    private canvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const pos = [ e.clientX, e.clientY ];
        if (position.contains(this.xTicksBox(), pos)) {
            this.input = this.eventToInputData(this.input, e, 'down-shiftX');
        } else if (position.contains(this.yTicksBox(), pos)) {
            this.input = this.eventToInputData(this.input, e, 'down-shiftY');
        } else if (position.contains(this.innerGraphBox(), pos)) {
            this.input = this.eventToInputData(this.input, e, 'down-zoom');

            if (this.props.threshold) {
                if (!this.canvasRef.current) return;
    
                const pos = position.getPosIn(this.innerGraphBox(), this.input.pos, false, true);
                const zoom = this.props.zoom as number[] | undefined;
    
                if (!pos || !zoom) return;
    
                const yVal = zoom[3] - (pos[1]) * (zoom[3] - zoom[2]);
    
                this.props.graph_threshold_select({ id: this.props.id, threshold: yVal });
            } else {
                e.preventDefault();
            }
        }
    }

    private canvasMouseMove = (e: MouseEvent) => {
        this.input = this.eventToInputData(this.input, e, 'move');
    }

    private canvasRuler = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const pos = position.getPosIn(this.innerGraphBox(), this.eventToInputData(this.input, e, 'move').pos, true, true);

        if (pos && this.props.zoom) {
            const { zoom, xType } = this.props;

            GLOBAL_RULER = { xType, value: zoom[0] + (zoom[1] - zoom[0]) * pos[0] };
        }
    }

    private canvasMouseUp = (e: MouseEvent) => {
        const innerBox = this.innerGraphBox();
        const down = this.input.down;

        this.input = this.eventToInputData(this.input, e, 'up');

        const { zoom } = this.props;
        if (!zoom || !down) { return; }

        if (down.action === 'zoom') {
            const downPos = position.getPosIn(innerBox, down.pos);
            const pos = position.getPosIn(innerBox, this.input.pos, true);

            if (!downPos || !pos) return;

            const start = [ ...downPos ];
            const compactX = Math.abs(pos[0] - start[0]) < COMPACT_RADIUS;
            const compactY = Math.abs(pos[1] - start[1]) < COMPACT_RADIUS;

            if (!compactX || !compactY) {
                const zoomRect = position.createRect(downPos, pos);
                const [ relXS, relXE, relYS, relYE ] = [
                    compactX ? 0 : zoomRect.x / innerBox.width,
                    compactX ? 1 : (zoomRect.x + zoomRect.width) / innerBox.width,
                    compactY ? 0 : 1.0 - (zoomRect.y + zoomRect.height) / innerBox.height,
                    compactY ? 1 : 1.0 - zoomRect.y / innerBox.height
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
        } else if (down.action === 'shiftX') {
            const xTicksRect = this.xTicksBox();

            if (position.contains(xTicksRect, this.input.pos)) {
                const xShift = (zoom[1] - zoom[0]) * (this.input.pos[0] - down.pos[0]) / xTicksRect.width;

                this.props.edit_graph({ id: this.props.id, zoom: [
                    zoom[0] - xShift, zoom[1] - xShift,
                    zoom[2], zoom[3]
                ] });
            }
        } else if (down.action === 'shiftY') {
            const yTicksRect = this.yTicksBox();

            if (position.contains(yTicksRect, this.input.pos)) {
                const yShift = (zoom[3] - zoom[2]) * (down.pos[1] - this.input.pos[1]) / yTicksRect.height;

                this.props.edit_graph({ id: this.props.id, zoom: [
                    zoom[0], zoom[1],
                    zoom[2] - yShift, zoom[3] - yShift
                ] });
            }
        }
    };

    private canvasKeyChange = (e: KeyboardEvent) => {
        this.input = {
            ...this.input,

            ctrl: e.ctrlKey,
            alt: e.altKey,
            shift: e.shiftKey,
        };
    }

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
                    ref={this.canvasRef}
                    hidden={this.props.traces.length <= 0}
                    onMouseDown={this.canvasMouseDown}
                    onMouseMove={this.canvasRuler}
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
                <div className='xticks' ref={this.xTicksRef} style={{ width: `calc(100% - ${2 * margin + yLabelSpace}px)`, top: `calc(100% - ${margin + xLabelSpace + X_TICK_SPACE}px)`, left: margin + yLabelSpace, height: X_TICK_SPACE }}>
                    {xTicks.map((tick, i) => (
                        <span className='tick' style={{ left: `${100 * tick.pos}%` }} key={i}>{this.getXTickString(tick.val)}</span>
                    ))}
                </div>
                <div className='ylabel' style={{ height: `calc(100% - ${2 * margin + xLabelSpace + X_TICK_SPACE}px)`, maxWidth: '1.8em', top: margin, whiteSpace: 'nowrap' }}>
                    <span style={{ transform: 'rotate(-90deg)' }} >{yLabel}</span>
                </div>
                <div className='yticks' ref={this.yTicksRef} style={{ height: `calc(100% - ${2 * margin + xLabelSpace + X_TICK_SPACE}px)`, top: margin, right: `calc(100% - ${margin + yLabelSpace}px)`, width: X_TICK_SPACE}}>
                    {yTicks.map((tick, i) => (
                        <span className='tick' style={{ bottom: `${100 * tick.pos}%` }} key={i}>{this.getYTickString(tick.val)}</span>
                    ))}
                </div>
            </>
        );
    }
}

export default connect(stateProps, dispatchProps)(GraphGui);