import * as React from 'react';
import { createPortal } from 'react-dom';
import { connect } from 'react-redux';
import debounce from 'lodash.debounce';
import domtoimage from 'dom-to-image';

import { icon } from '../utils/icon';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faWrench, faExclamationTriangle, faDesktop, faArrowsAltH, faCamera, faMinusSquare } from '@fortawesome/free-solid-svg-icons';

import { Button, OverlayTrigger, Spinner, Tooltip } from 'react-bootstrap';
import { Menu, useContextMenu, Submenu, Item, ItemParams, Separator } from 'react-contexify';

import { dataWorker } from '..';
import { transfer } from 'comlink';
import { AppEvents, DialogService } from '../services';

import './Graph.css';
import { t } from '../locale';
import { timestampToLongDate } from '../locale/date';
import { graph_threshold_select, clone_graph, remove_graphs, edit_graph, toggle_traces, DispatchProps, hide_graphs } from '../redux';
import { ConfirmModal, GraphEditModal, LdevSelectModal } from './Modals';
import RendererHandle from '../services/RendererHandle';
import { PendingDataJob } from '../redux/jobs';
import moment from 'moment';
import { parseTimestamp } from '../utils/datetime';
import { isHomogenous } from '../utils/trace';
import { getLdevMode } from '../utils/ldev';

function MenuPortal({ children }: { children: React.ReactNode }) {
    const elem = document.getElementById('context-menu');
    return elem ? createPortal(children, elem) : <>{children}</>;
}

const X_TICK_SPACE = 24;
const COMPACT_RADIUS = 16;

let GLOBAL_RULER: RulerData | undefined = undefined;

const dispatchProps = {
    graph_threshold_select,
    clone_graph,
    remove_graphs,
    edit_graph,
    toggle_traces,
    hide_graphs
};

const stateProps = (state: RootStore, props: Pick<Graph, 'id'>) => ({
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    ...(state.graphs.items.find(g => g.id === props.id)!),
    threshold: state.graphs.threshold,
    jobs: state.jobs.items,
});

type Props = DispatchProps<typeof dispatchProps> & Graph & {
    focused?: boolean;
    layoutLocked: boolean;
    threshold: boolean;
    jobs: { [handle: number]: PendingDataJob };
}

type State = {
    rendering: boolean;
    ldevSelectAvailable: boolean;
    xTicks: { pos: number, val: number }[];
    yTicks: { pos: number, val: number }[];
}

class GraphComponent
    extends React.Component<Props, State> {

    public state: State = {
        rendering: false,
        ldevSelectAvailable: false,
        xTicks: [],
        yTicks: [],
    }

    private canvasRef = React.createRef<HTMLCanvasElement>();
    private guiCanvasRef= React.createRef<HTMLCanvasElement>();
    private graphRef = React.createRef<HTMLDivElement>();
    private renderer: RendererHandle | undefined;

    redrawGraph = async () => {
        if (!this.renderer) return;

        this.setState({ rendering: true });

        const disabled: Trace[] = [];
        const enabledOffbundle: Trace[] = [];

        this.props.traces.forEach(t => {
            if (!t.active) {
                disabled.push(t);
            } else {
                if (!this.renderer?.bundles.some(b => b.traces.has(t.handle))) {
                    enabledOffbundle.push(t);
                }
            }
        });

        const job = this.renderer.createJob(this.props.xType, enabledOffbundle.length, disabled.length)
            .margin(this.props.style.margin)
            .labelSpaces(this.props.style.xLabelSpace + X_TICK_SPACE, this.props.style.yLabelSpace)
            .clear(true)
            .zoom(...(this.props.zoom ?? [ ...this.props.xRange, 0.0, 1.0 ]));

        this.renderer.bundles.forEach(b => job.addBundle(b.handle));
        enabledOffbundle.forEach(t => job.addTrace(t));
        disabled.forEach(t => job.blacklistTrace(t));

        const result = await job.invoke();

        this.setState({ rendering: false, xTicks: result.x_ticks, yTicks: result.y_ticks });
    }

    public async componentDidMount() {
        // Hook global events
        window.addEventListener('resize', this.debounceResize);
        window.addEventListener('mouseup', this.canvasMouseUp);
        AppEvents.onRelayout.on(this.onLayoutChange);
        requestAnimationFrame(this.drawGui);

        // Ensure canvas init
        const canvas = this.canvasRef.current;
        if (canvas) {
            // Bind offscreen renderer on another thread
            const offscreen = canvas.transferControlToOffscreen();

            this.renderer = await RendererHandle.create(transfer(offscreen, [ offscreen ] ));
        } else {
            throw new Error('Underlying canvas element was not initialized for this graph.');
        }
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
        this.renderer && await this.renderer.dispose();
    }

    private zoomRecommendation: Promise<Graph['zoom']> | undefined;
    public async componentDidUpdate(prevProps: Props) {
        let redraw: boolean | undefined = undefined;

        if (this.props.traces !== prevProps.traces) {
            const handles = this.props.traces.filter(t => t.active).map(t => t.handle);
            const [ from, to ] = this.props.xRange;

            if (this.props.traces.length > 0 && this.props.zoom === undefined) {
                await this.renderer?.createBundle(this.props.xRange, this.props.traces);

                this.props.edit_graph({
                    id: this.props.id,
                    zoom: await (this.zoomRecommendation = dataWorker.recommend_extents(from, to, handles))
                });

                redraw = false;
            } else {
                this.zoomRecommendation = dataWorker.recommend_extents(from, to, handles);

                const toAdd: Trace[] = []; // TODO:
                const toDel: number[] = [];
                const toMod: Trace[] = []; // TODO:

                const prev = new Set(prevProps.traces.map(t => t.id));
                const next = new Set(this.props.traces.map(t => t.id));

                for (const trace of prevProps.traces) {
                    if (!next.has(trace.id)) {
                        toDel.push(trace.handle);
                    }
                }

                for (const trace of this.props.traces) {
                    if (!prev.has(trace.id)) {
                        toAdd.push(trace);
                    }
                }

                for (const bundle of this.renderer?.bundles ?? []) {
                    const toAddHere = [] as Trace[]; // TODO: be smart about this and reduce number of traces for a new bundle
                    const toDelHere = toDel.filter(r => bundle.traces.has(r));
                    const toModHere = toMod.filter(r => bundle.traces.has(r.handle));

                    if (toDelHere.length > 0) {
                        console.log(`rebundling ${bundle.handle}`);
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        const rebundle = this.renderer!.rebundle(bundle.handle, toAddHere.length, toDelHere.length, toModHere.length);

                        toAddHere.forEach(t => rebundle.addTrace(t));
                        toDelHere.forEach(t => rebundle.deleteTrace({ handle: t }));
                        toModHere.forEach(t => rebundle.modifyTrace(t));

                        await rebundle.invoke();
                    }
                }

                if (toAdd.length > 0) {
                    await this.renderer?.createBundle(this.props.xRange, toAdd);
                }

                redraw = true;
            }

            this.setState({
                ldevSelectAvailable: isHomogenous(this.props.traces) && getLdevMode(this.props.traces[0]) === 'ldev'
            });
        }

        if (this.props.layoutLocked !== prevProps.layoutLocked && this.props.layoutLocked) {
            await this.updateSize();
            redraw = false;
        }

        if (this.props.zoom !== prevProps.zoom && this.props.zoom && this.renderer) {
            if (redraw === undefined) redraw = true;
        }

        if (redraw) {
            await this.redrawGraph();
        }
    }

    private onRemove = () =>
        DialogService.open(
            ConfirmModal,
            res => res && this.props.remove_graphs(this.props.id),
            {
                title: t('modals.removeGraph.title', { name: this.props.title }),
                body: t('modals.removeGraph.body'),
                okColor: 'danger',
            },
        );
    private onEdit = () =>
        DialogService.open(
            GraphEditModal,
            edit => edit && this.props.edit_graph({ ...edit, id: this.props.id }),
            { graph: this.props as Graph }
        );

    private onHide = () => this.props.hide_graphs(this.props.id);

    private prevWidth = 0;
    private prevHeight = 0;
    private updateSize = async () => {
        if (this.canvasRef.current) {
            const width = this.canvasRef.current.clientWidth;
            const height = this.canvasRef.current.clientHeight;

            if (this.canvasRef.current && this.renderer && (this.prevWidth !== width || this.prevHeight !== height)) {
                const gui = this.guiCanvasRef.current;
                if (gui) {
                    gui.width = width,
                    gui.height = height;
                }
                await this.renderer.resize(width, height);
                await this.redrawGraph();
            }

            this.prevWidth = width;
            this.prevHeight = height;
        }
    }

    private graphArea = () => {
        if (!this.guiCanvasRef.current) return [0, 0];

        const { margin, xLabelSpace, yLabelSpace } = this.props.style;

        return [
            this.guiCanvasRef.current.width  - 2 * margin  - yLabelSpace,
            this.guiCanvasRef.current.height - 2 * margin - xLabelSpace - X_TICK_SPACE
        ];
    };

    public drawGui = () => {
        window.requestAnimationFrame(this.drawGui);

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

    private debounceResize = debounce(this.updateSize, 300);
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
        const [ from, to ] = this.props.xRange;

        const zoom = this.zoomRecommendation ? await this.zoomRecommendation : [ from, to, 0.0, 1.0 ] as Graph['zoom'];

        this.props.edit_graph({
            id: this.props.id,
            zoom
        });
    }
    private onClone = ({ data }: ItemParams<unknown, 'active' | 'all'>) => {
        this.props.clone_graph({ id: this.props.id, activeOnly: data === 'active' });
    }
    private onLdevFilter = () => {
        DialogService.open(
            LdevSelectModal,
            res => res && this.props.toggle_traces({
                id: this.props.id,
                traces: new Set(res.map(t => t.id)),
                val: true,
                negateRest: true,
            }),
            { traces: this.props.traces }
        );
    }

    private takeScreenshot = () => {
        if (this.graphRef.current) {
            domtoimage.toPng(this.graphRef.current).then(url => {
                const link = document.createElement('a');
                link.download = `graph-${this.props.id}.png`;
                link.href = url;
                link.click();
            });
        }
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
        const { title, traces, metadata, xRange, } = this.props;
        const { margin, xLabelSpace, yLabelSpace } = this.props.style;

        const pendingJobs = Object.values(this.props.jobs).filter(j => j.relatedGraphs.includes(this.props.id) && j.state === 'pending');
        const failedJobs  = Object.values(this.props.jobs).filter(j => j.relatedGraphs.includes(this.props.id) && j.state === 'error');

        const menuShow = useContextMenu({ id: `graph-${this.props.id}-menu` }).show;

        const onContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
            e.preventDefault();
            menuShow(e);
        };

        return (
            <div className={`graph ${this.props.focused ? 'active' : ''}`} ref={this.graphRef}>
                <div className='text-center position-relative'>
                    <h5 className='my-0 w-100 text-center'>{title}</h5>
                    <div style={{ right: 0, top: 0, bottom: 0 }} className='d-flex align-items-center position-absolute buttons'>
                        {pendingJobs.length > 0 && (
                            <OverlayTrigger
                                trigger={[ 'focus', 'hover' ]}
                                placement='left'
                                container={document.getElementById('context-menu')}

                                overlay={(
                                    <Tooltip id={`load-tooltip-${this.props.id}`}>
                                        {t('graph.pendingJobs', { count: pendingJobs.length })}
                                    </Tooltip>
                                )}
                            >
                                <Button size='sm' variant='link' className='opaque'>
                                    <Spinner animation='border' variant='primary' size='sm' />
                                </Button>
                            </OverlayTrigger>
                        )}
                        {failedJobs.length > 0 && (
                            <OverlayTrigger
                                trigger={[ 'focus', 'hover' ]}
                                placement='left'
                                container={document.getElementById('context-menu')}

                                overlay={(
                                    <Tooltip id={`load-tooltip-${this.props.id}`}>
                                        {t('graph.failedJobs', { count: failedJobs.length })}
                                    </Tooltip>
                                )}
                            >
                                <Button size='sm' variant='link' className='opaque'>
                                    <FontAwesomeIcon icon={faExclamationTriangle} color='red' />
                                </Button>
                            </OverlayTrigger>
                        )}
                        <Button size='sm' variant='none' onClick={this.takeScreenshot}><FontAwesomeIcon icon={faCamera} /></Button>
                        <Button size='sm' variant='none' onClick={this.onEdit}>  <FontAwesomeIcon icon={faWrench} /></Button>
                        <Button size='sm' variant='none' onClick={this.onHide}><FontAwesomeIcon icon={faMinusSquare} /></Button>
                        <Button size='sm' variant='none' onClick={this.onRemove}><FontAwesomeIcon icon={faTrash}  /></Button>
                    </div>
                </div>
                <div className='graph-content'>
                    {traces.length <= 0 && (<div>{t('graph.noTraces')}</div>)}
                    <canvas
                        ref={this.canvasRef}
                        // hidden={traces.length <= 0}
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
                                <Item onClick={this.onClone} data='all' data-clone="all">{t('graph.cloneAll')}</Item>
                                <Item onClick={this.onClone} data='active' data-clone="active" disabled={!this.props.traces.find(t => t.active)}>{t('graph.cloneActive')}</Item>
                            </Submenu>
                            {this.state.ldevSelectAvailable && (
                                <>
                                    <Separator />
                                    <Item onClick={this.onLdevFilter}>{t('graph.ldevSelect')}</Item>
                                </>
                            )}
                        </Menu>
                    </MenuPortal>
                    {!this.props.layoutLocked ? (
                        <div className='graph-resize-overlay'><h3>{t('graph.redrawNotice')}...</h3></div>
                    ) : (this.state.rendering && (
                        <div className='graph-resize-overlay'><Spinner animation='border' variant='light' /></div>
                    ))}
                    <div className='graph-details'>
                        { icon(faDesktop)   }{ metadata.sourceNames.join('; ') } <br/>
                        { icon(faArrowsAltH) }{ timestampToLongDate(xRange[0]) } – { timestampToLongDate(xRange[1]) }
                    </div>
                    {/* <div style={{ }}>
                        {this.props.yLabel}
                    </div> */}
                    <div className='xlabel' style={{ left: margin + yLabelSpace, right: margin, maxHeight: xLabelSpace }}>
                        {this.props.xLabel}
                    </div>
                    <div className='xticks' style={{ width: `calc(100% - ${2 * margin + yLabelSpace}px)`, top: `calc(100% - ${margin + xLabelSpace + X_TICK_SPACE}px)`, left: margin + yLabelSpace}}>
                        {this.state.xTicks.map((tick, i) => (
                            <span className='tick' style={{ left: `${100 * tick.pos}%` }} key={i}>{this.getXTickString(tick.val)}</span>
                        ))}
                    </div>
                    <div className='ylabel' style={{ height: `calc(100% - ${2 * margin + xLabelSpace + X_TICK_SPACE}px)`, maxWidth: '1.8em', top: margin, whiteSpace: 'nowrap' }}>
                        <span style={{ transform: 'rotate(-90deg)' }} >{this.props.yLabel}</span>
                    </div>
                    <div className='yticks' style={{ height: `calc(100% - ${2 * margin + xLabelSpace + X_TICK_SPACE}px)`, top: margin, right: `calc(100% - ${margin + yLabelSpace}px)`}}>
                        {this.state.yTicks.map((tick, i) => (
                            <span className='tick' style={{ bottom: `${100 * tick.pos}%` }} key={i}>{this.getYTickString(tick.val)}</span>
                        ))}
                    </div>
                </div>
            </div>
        );
    }
}

export default connect(stateProps, dispatchProps)(GraphComponent);
