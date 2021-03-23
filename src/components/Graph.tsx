import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faWrench } from '@fortawesome/free-solid-svg-icons';
import * as React from 'react';
import debounce from 'lodash.debounce';
import { transfer } from 'comlink';
import { plotWorker } from '..';
import { Spinner } from 'react-bootstrap';
import { Menu, useContextMenu, Submenu, Item, ItemParams } from 'react-contexify';

import './Graph.css';
import { GraphExtents } from '../plotting';
import { AppEvents } from '../services';
import { createPortal } from 'react-dom';
import { connect } from 'react-redux';
import { ReduxProps, graph_threshold_select } from '../redux';

const zoomToExtent = (zoom: number[]) => ({ x_start: zoom[0], x_end: zoom[1], y_start: zoom[2], y_end: zoom[3] });

function MenuPortal({ children }: { children: React.ReactNode }) {
    const elem = document.getElementById('context-menu');
    return elem ? createPortal(children, elem) : <>{children}</>;
}

class GraphComponent
    extends React.Component<Props, State> {

    public state: State = {
        revision: 0,
        rendering: false,
    }

    private canvasRef: React.RefObject<HTMLCanvasElement> = React.createRef();
    private guiCanvasRef: React.RefObject<HTMLCanvasElement> = React.createRef();
    private rendererUid: string | undefined;
    private traces: { id: Trace['id'], ptr: number }[] = [];

    redrawGraph = async () => {
        if (!this.rendererUid) return;
        
        this.setState({ rendering: true });
        const trace_ptrs = this.traces.filter(t => this.props.activeTraces.indexOf(t.id) >= 0).map(t => t.ptr);
        await plotWorker.clearChart(this.rendererUid);
        await plotWorker.renderTraces(this.rendererUid, trace_ptrs.map(p => ({ ptr: p, color: [0,0,0] })));

        this.traces.length > 0 && this.setState({ rendering: false });
    }

    public async componentDidMount() {
        // Hook global events
        window.addEventListener('resize', this.debounceResize);
        window.addEventListener('mouseup', this.canvasMouseUp);
        AppEvents.onRelayout.on(this.onLayoutChange);

        // Ensure canvas init
        const canvas = this.canvasRef.current;
        if (canvas) {
            // Bind offscreen renderer on another thread
            const offscreen = canvas.transferControlToOffscreen();
    
            this.rendererUid = await plotWorker.createOffscreen(
                transfer(offscreen, [ offscreen ]),
                this.props.xType,
                zoomToExtent((this.props.zoom ?? [ 0, 1e10, 0, 1e3 ]) as number[]),
                {
                    margin: this.props.style.margin,
                    x_label_space: this.props.style.xLabelSpace,
                    y_label_space: this.props.style.yLabelSpace,
                }
            );
    
            await this.updateSize();
        } else {
            throw new Error('Underlying canvas element was not initialized for this graph.');
        }

        // Load traces
        this.componentDidUpdate({ ...this.props, traces: [] });
    }

    onLayoutChange = async () => {
        await this.updateSize();
    }

    public async componentWillUnmount() {
        // Unhook global events
        window.removeEventListener('resize', this.debounceResize);
        window.removeEventListener('mouseup', this.canvasMouseUp);
        AppEvents.onRelayout.remove(this.onLayoutChange);

        // Dispose off-thread renderer
        this.rendererUid && await plotWorker.disposeOffscreen(this.rendererUid);
    }

    public async componentDidUpdate(prevProps: Props) {
        if (this.props.traces !== prevProps.traces) {
            const newTraces: Trace[] = this.props.traces.filter(t => prevProps.traces.indexOf(t) < 0);
            const removedTraces: Trace[] = prevProps.traces.filter(t => this.props.traces.indexOf(t) < 0);
    
            if (removedTraces.length > 0) {
                this.traces = this.traces.filter(d => removedTraces.findIndex(t => t.id === d.id) < 0);

                newTraces.length <= 0 && this.redrawGraph();
            }
    
            if (newTraces.length > 0) {
                this.setState({ rendering: true });
                const loaded = await plotWorker.getTraceData(this.props.xRange[0], this.props.xRange[1], newTraces);
                this.traces.push(...loaded);

                // Redraw lines if initial zoom exists, otherwise recommend an initial zoom
                if (this.props.zoom) {
                    await this.redrawGraph();
                } else {
                    const { x_start, x_end, y_start, y_end } = await plotWorker.getExtentRecommendation(this.traces.map(l => l.ptr));
                    this.props.onZoomUpdated && this.props.onZoomUpdated(this.props.id, [ x_start, x_end, y_start, y_end ]);
                }
            }
        }

        if (this.props.layoutLocked !== prevProps.layoutLocked && this.props.layoutLocked) {
            await this.updateSize();
        }

        if (this.props.zoom !== prevProps.zoom && this.props.zoom && this.rendererUid) {
            await plotWorker.callRendererFunc(this.rendererUid, 'set_extents', [ zoomToExtent(this.props.zoom as number[]) as GraphExtents ]);
            await this.redrawGraph();
        } else if (this.props.activeTraces !== prevProps.activeTraces) {
            await this.redrawGraph();
        }
    }

    private onRemove = () => this.props.onRemove && this.props.onRemove(this.props.id);
    private onEdit   = () => this.props.onEdit && this.props.onEdit(this.props.id);

    private prevWidth = 0;
    private prevHeight = 0;
    private updateSize = async () => {
        if (this.canvasRef.current) {
            const width = this.canvasRef.current.clientWidth;
            const height = this.canvasRef.current.clientHeight;

            if (this.canvasRef.current && this.rendererUid && (this.prevWidth !== width || this.prevHeight !== height)) {
                const gui = this.guiCanvasRef.current;
                if (gui) {
                    gui.width = width,
                    gui.height = height;
                }
                await plotWorker.callRendererFunc(this.rendererUid, 'resize', [width, height]);
                await this.redrawGraph();
            }

            this.prevWidth = width;
            this.prevHeight = height;
        }
    }

    private debounceResize = debounce(this.updateSize, 300);
    private positionInGraphSpace = (e: { clientX: number, clientY: number }): [ number, number ] | undefined => {
        const rect = this.guiCanvasRef.current?.getBoundingClientRect();
        if (!rect) return undefined;

        const { margin, xLabelSpace, yLabelSpace } = this.props.style;

        const pos: [number, number] = [ e.clientX - rect.x - margin - yLabelSpace, e.clientY - rect.y - margin ];

        if (pos[0] >= 0 && pos[1] >= 0 &&
            pos[0] < rect.width - 2 * margin - yLabelSpace &&
            pos[1] < rect.height - 2 * margin - xLabelSpace) {

            return pos;
        }

        return undefined;
    }

    private downPos?: [number, number] = undefined;
    private canvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (this.props.threshold) {
            if (!this.guiCanvasRef.current) return;
            const { margin, xLabelSpace, yLabelSpace } = this.props.style;

            const pos = this.positionInGraphSpace(e);
            const zoom = this.props.zoom as number[] | undefined;
            const area = [
                this.guiCanvasRef.current.width - 2 * margin  - yLabelSpace,
                this.guiCanvasRef.current.height - 2 * margin - xLabelSpace
            ];

            if (!pos || !zoom) return;

            const yVal = zoom[3] - (pos[1] / area[1]) * (zoom[3] - zoom[2]);

            this.props.graph_threshold_select({ id: this.props.id, threshold: yVal });
        } else {
            e.preventDefault();
            this.downPos = this.positionInGraphSpace(e);
        }
    };

    private canvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = this.guiCanvasRef.current?.getContext('2d');
        if (!canvas) return;
        const pos = this.positionInGraphSpace(e);
        const { margin, yLabelSpace } = this.props.style;

        if (this.props.threshold) {
            if (!pos) return;

            canvas.clearRect(0, 0, canvas.canvas.width, canvas.canvas.height);
            canvas.beginPath();
            canvas.moveTo(margin + yLabelSpace, pos[1] + margin);
            canvas.lineTo(canvas.canvas.width - margin - 1, pos[1] + margin);
            canvas.stroke();
        } else if (this.downPos) {

            if (pos) {

                const rect = {
                    x: Math.min(pos[0], this.downPos[0]) + margin + yLabelSpace,
                    y: Math.min(pos[1], this.downPos[1]) + margin,
                    width: Math.abs(pos[0] - this.downPos[0]),
                    height: Math.abs(pos[1] - this.downPos[1])
                };

                canvas.clearRect(0, 0, canvas.canvas.width, canvas.canvas.height);
                canvas.beginPath();
                canvas.setLineDash([5, 5]);
                canvas.strokeRect(rect.x, rect.y, rect.width, rect.height);
                canvas.stroke();
            }
        }
    }

    private canvasMouseUp = (e: MouseEvent) => {
        if (this.downPos && this.guiCanvasRef.current) {
            const pos = this.positionInGraphSpace(e);

            if (pos && this.props.zoom) {
                const zoom = this.props.zoom as number[];
                const { margin, xLabelSpace, yLabelSpace } = this.props.style;

                const area = [
                    this.guiCanvasRef.current.width - 2 * margin  - yLabelSpace,
                    this.guiCanvasRef.current.height - 2 * margin - xLabelSpace
                ];

                if (Math.abs((this.downPos[0] - pos[0]) * (this.downPos[1] - pos[1])) > 16) {
                    const [ relXS, relXE, relYS, relYE ] = [
                        Math.min(this.downPos[0], pos[0]) / area[0],
                        Math.max(this.downPos[0], pos[0]) / area[0],
                        1.0 - (Math.max(this.downPos[1], pos[1]) / area[1]),
                        1.0 - (Math.min(this.downPos[1], pos[1]) / area[1])
                    ];

                    this.props.onZoomUpdated && this.props.onZoomUpdated(this.props.id, [
                        zoom[0] + relXS * (zoom[1] - zoom[0]),
                        zoom[0] + relXE * (zoom[1] - zoom[0]),
                        zoom[2] + relYS * (zoom[3] - zoom[2]),
                        zoom[2] + relYE * (zoom[3] - zoom[2])
                    ]);
                }
            }

            this.downPos = undefined;
        }

        const ctx = this.guiCanvasRef.current?.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        }
    };
    private canvasMouseLeave = () => {
        const ctx = this.guiCanvasRef.current?.getContext('2d');
        if (this.downPos && ctx) {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        }
    }
    private canvasDoubleClick = async () => {
        const { x_start, x_end, y_start, y_end } = await plotWorker.getExtentRecommendation(this.traces.map(l => l.ptr));
        this.props.onZoomUpdated && this.props.onZoomUpdated(this.props.id, [ x_start, x_end, y_start, y_end ]);
    }
    private onClone = ({ data }: ItemParams<unknown, 'active' | 'all'>) => {
        this.props.onClone && this.props.onClone(this.props.id, data === 'active');
    }

    public render() {
        const { title, traces } = this.props;

        const menuShow = useContextMenu({ id: `graph-${this.props.id}-menu` }).show;

        const onContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
            e.preventDefault();
            menuShow(e);
        };

        return (
            <div className={`graph ${this.props.focused ? 'active' : ''}`}>
                <div className='text-center position-relative'>
                    <h4 className='mt-1 w-100 text-center'>{title}</h4>
                    <div style={{ right: 0, top: 0, bottom: 0 }} className='d-flex align-items-center position-absolute buttons'>
                        <button className='btn btn-sm' onClick={this.onEdit}><FontAwesomeIcon icon={faWrench} /></button>
                        <button className='btn btn-sm' onClick={this.onRemove}><FontAwesomeIcon icon={faTrash} /></button>
                    </div>
                </div>
                <div className='graph-content'>
                    {traces.length <= 0 && (<div>Graf nemá žádné křivky</div>)}
                    <canvas
                        ref={this.canvasRef}
                        hidden={traces.length <= 0}
                    />
                    <canvas
                        ref={this.guiCanvasRef}
                        hidden={traces.length <= 0}
                        onMouseDown={this.canvasMouseDown}
                        onMouseMove={this.canvasMouseMove}
                        onMouseLeave={this.canvasMouseLeave}
                        onDoubleClick={this.canvasDoubleClick}
                        onContextMenu={onContextMenu}
                    />
                    <MenuPortal>
                        <Menu id={`graph-${this.props.id}-menu`}>
                            <Submenu label="Clone Chart">
                                <Item onClick={this.onClone} data='all' data-clone="all">Clone All Series</Item>
                                <Item onClick={this.onClone} data='active' data-clone="active" disabled={this.props.activeTraces.length <= 0}>Clone Active Series</Item>
                            </Submenu>
                        </Menu>
                    </MenuPortal>
                </div>
                {!this.props.layoutLocked ? (
                    <div className='graph-resize-overlay'><h3>Graf se překreslí po uzamknutí rozložení...</h3></div>
                ) : (this.state.rendering && (
                    <div className='graph-resize-overlay'><Spinner animation='border' variant='light' /></div>
                ))}
            </div>
        );
    }
}

const stateProps = (state: RootStore) => ({ threshold: state.graphs.threshold });

const dispatchProps = {
    graph_threshold_select
};

type Props = ReduxProps<typeof stateProps, typeof dispatchProps> & Graph & {
    focused?: boolean;
    layoutLocked: boolean;

    onZoomUpdated?(id: Graph['id'], zoom: Graph['zoom']): void;
    onEdit?(id: Graph['id']): void;
    onRemove?(id: Graph['id']): void;
    onClone?(id: Graph['id'], active: boolean): void;
}

type State = {
    revision: number;
    rendering: boolean;
}

export default connect(stateProps, dispatchProps)(GraphComponent);