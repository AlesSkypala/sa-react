import * as React from 'react';
import { createPortal } from 'react-dom';
import { connect } from 'react-redux';
import debounce from 'lodash.debounce';

import { icon } from '../utils/icon';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faWrench, faExclamationTriangle, faChartLine, faDesktop, faArrowsAltH } from '@fortawesome/free-solid-svg-icons';

import { Button, OverlayTrigger, Spinner, Tooltip } from 'react-bootstrap';
import { Menu, useContextMenu, Submenu, Item, ItemParams } from 'react-contexify';

import { dataWorker } from '..';
import { transfer } from 'comlink';
import { AppEvents, DialogService } from '../services';

import './Graph.css';
import { t } from '../locale';
import { timestampToLongDate } from '../locale/date';
import { graph_threshold_select, clone_graph, remove_graphs, edit_graph, DispatchProps } from '../redux';
import { ConfirmModal, GraphEditModal } from './Modals';
import RendererHandle from '../services/RendererHandle';
import { PendingDataJob } from '../redux/jobs';

function MenuPortal({ children }: { children: React.ReactNode }) {
    const elem = document.getElementById('context-menu');
    return elem ? createPortal(children, elem) : <>{children}</>;
}

const dispatchProps = {
    graph_threshold_select,
    clone_graph,
    remove_graphs,
    edit_graph,
};

type Props = DispatchProps<typeof dispatchProps> & Graph & {
    focused?: boolean;
    layoutLocked: boolean;
    threshold: boolean;
    jobs: PendingDataJob[];
    failedJobs: PendingDataJob[];
}

type State = {
    revision: number;
    rendering: boolean;
}

class GraphComponent
    extends React.Component<Props, State> {

    public state: State = {
        revision: 0,
        rendering: false,
    }

    private canvasRef: React.RefObject<HTMLCanvasElement> = React.createRef();
    private guiCanvasRef: React.RefObject<HTMLCanvasElement> = React.createRef();
    private renderer: RendererHandle | undefined;

    redrawGraph = async () => {
        if (!this.renderer) return;

        this.setState({ rendering: true });

        const job = this.renderer.createJob(this.props.xType)
            .clear(true)
            .zoom(...(this.props.zoom ?? [ ...this.props.xRange, 0.0, 1.0 ]));

        this.props.traces
            .filter(t => this.props.activeTraces.includes(t.id))
            .forEach(t => job.addTrace(t.id, t.style));

        await job.invoke();

        this.setState({ rendering: false });
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

            this.renderer = await RendererHandle.create(transfer(offscreen, [ offscreen ] ));
            await this.updateSize();
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

    public async componentDidUpdate(prevProps: Props) {
        let redraw: boolean | undefined = undefined;

        if (this.props.traces !== prevProps.traces) {
            if (this.props.traces.length > 0 && this.props.zoom === undefined) {
                const ids = this.props.traces.map(t => t.id).filter(id => this.props.activeTraces.includes(id));
                const [ from, to ] = this.props.xRange;

                this.props.edit_graph({
                    id: this.props.id,
                    zoom: await dataWorker.recommend_extents(from, to, ids)
                });
                redraw = false;
            } else {
                redraw = true;
            }
        }

        if (this.props.layoutLocked !== prevProps.layoutLocked && this.props.layoutLocked) {
            await this.updateSize();
            redraw = false;
        }

        if (this.props.zoom !== prevProps.zoom && this.props.zoom && this.renderer) {
            if (redraw === undefined) redraw = true;
        } else if (this.props.activeTraces !== prevProps.activeTraces) {
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

                    this.props.edit_graph({ id: this.props.id, zoom: [
                        zoom[0] + relXS * (zoom[1] - zoom[0]),
                        zoom[0] + relXE * (zoom[1] - zoom[0]),
                        zoom[2] + relYS * (zoom[3] - zoom[2]),
                        zoom[2] + relYE * (zoom[3] - zoom[2])
                    ] });
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
        const ids = this.props.traces.map(t => t.id).filter(id => this.props.activeTraces.includes(id));
        const [ from, to ] = this.props.xRange;

        const zoom = await dataWorker.recommend_extents(from, to, ids);

        this.props.edit_graph({
            id: this.props.id,
            zoom
        });
    }
    private onClone = ({ data }: ItemParams<unknown, 'active' | 'all'>) => {
        this.props.clone_graph({ id: this.props.id, activeOnly: data === 'active' });
    }

    public render() {
        const { title, traces, jobs, failedJobs, metadata, xRange } = this.props;

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
                        {jobs.length > 0 && (
                            <OverlayTrigger
                                trigger={[ 'focus', 'hover' ]}
                                placement='left'
                                container={document.getElementById('context-menu')}

                                overlay={(
                                    <Tooltip id={`load-tooltip-${this.props.id}`}>
                                        {t('graph.pendingJobs', { count: jobs.length })}
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
                        <Button size='sm' variant='none' onClick={this.onEdit}>  <FontAwesomeIcon icon={faWrench} /></Button>
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
                                <Item onClick={this.onClone} data='active' data-clone="active" disabled={this.props.activeTraces.length <= 0}>{t('graph.cloneActive')}</Item>
                            </Submenu>
                        </Menu>
                    </MenuPortal>
                    {!this.props.layoutLocked ? (
                        <div className='graph-resize-overlay'><h3>{t('graph.redrawNotice')}...</h3></div>
                    ) : (this.state.rendering && (
                        <div className='graph-resize-overlay'><Spinner animation='border' variant='light' /></div>
                    ))}
                    <div className='graph-details'>
                        { icon(faDesktop)   }{ metadata.sourceNames.join('; ') } <br/>
                        { icon(faChartLine) }{ metadata.datasetNames.join('; ') } <br/>
                        { icon(faArrowsAltH) }{ timestampToLongDate(xRange[0]) } – { timestampToLongDate(xRange[1]) }
                    </div>
                </div>
            </div>
        );
    }
}

const stateProps = (state: RootStore, props: Pick<Graph, 'id'>) => ({
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    ...(state.graphs.items.find(g => g.id === props.id)!),
    threshold: state.graphs.threshold,
    jobs: Object.values(state.jobs.items).filter(j => j.relatedGraphs.includes(props.id) && j.state === 'pending'),
    failedJobs: Object.values(state.jobs.items).filter(j => j.relatedGraphs.includes(props.id) && j.state === 'error'),
});

export default connect(stateProps, dispatchProps)(GraphComponent);
