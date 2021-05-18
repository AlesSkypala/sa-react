import * as React from 'react';
import { createPortal } from 'react-dom';
import { connect } from 'react-redux';
import debounce from 'lodash.debounce';
import domtoimage from 'dom-to-image';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faWrench, faExclamationTriangle, faCamera, faMinusSquare } from '@fortawesome/free-solid-svg-icons';

import { Button, OverlayTrigger, Spinner, Tooltip } from 'react-bootstrap';
import { Menu, useContextMenu, Submenu, Item, ItemParams, Separator } from 'react-contexify';

import { dataWorker } from '..';
import { transfer } from 'comlink';
import { AppEvents, DialogService } from '../services';

import './Graph.css';
import { t } from '../locale';
import { graph_threshold_select, clone_graph, remove_graphs, edit_graph, toggle_traces, DispatchProps, hide_graphs, set_settings } from '../redux';
import { GraphEditModal, LdevSelectModal } from './Modals';
import RendererHandle from '../services/RendererHandle';
import { PendingDataJob } from '../redux/jobs';
import { isHomogenous } from '../utils/trace';
import { getLdevMode } from '../utils/ldev';
import GraphDeleteConfirmation from './Modals/GraphDeleteConfirmation';
import GraphGui from './GraphGui';

function MenuPortal({ children }: { children: React.ReactNode }) {
    const elem = document.getElementById('context-menu');
    return elem ? createPortal(children, elem) : <>{children}</>;
}

export const X_TICK_SPACE = 24;

const dispatchProps = {
    graph_threshold_select,
    clone_graph,
    remove_graphs,
    edit_graph,
    toggle_traces,
    hide_graphs,
    set_settings
};

const stateProps = (state: RootStore, props: Pick<Graph, 'id'>) => ({
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    ...(state.graphs.items.find(g => g.id === props.id)!),
    threshold: state.graphs.threshold,
    jobs: state.jobs.items,
    askClose: state.settings.askGraphClose,
});

export type Props = DispatchProps<typeof dispatchProps> & Graph & {
    focused?: boolean;
    layoutLocked: boolean;
    threshold: boolean;
    jobs: { [handle: number]: PendingDataJob };
    askClose: boolean;
}

export type State = {
    rendering: boolean;
    error: unknown | undefined;
    ldevSelectAvailable: boolean;
    xTicks: { pos: number, val: number }[];
    yTicks: { pos: number, val: number }[];
    zoomRecommendation: Promise<Graph['zoom']> | undefined;

    clientWidth: number,
    clientHeight: number,
}

class GraphComponent
    extends React.Component<Props, State> {

    public state: State = {
        rendering: false,
        ldevSelectAvailable: false,
        error: undefined,
        xTicks: [],
        yTicks: [],
        zoomRecommendation: undefined,
        clientWidth:  1,
        clientHeight: 1,
    }

    private canvasRef = React.createRef<HTMLCanvasElement>();
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
        
        let result;
        try {
            result = await job.invoke();
        } catch (error) {
            this.setState({ error });
            return;
        }

        this.setState({ rendering: false, xTicks: result.x_ticks, yTicks: result.y_ticks });
    }

    public async componentDidMount() {
        // Hook global events
        window.addEventListener('resize', this.debounceResize);
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

        if (this.props.traces.length > 0) {
            const [ from, to ] = this.props.xRange;
            this.setState({ zoomRecommendation: dataWorker.recommend_extents(from, to, this.props.traces.map(t => t.handle)) });
            await this.rebundle(this.props.traces, [], []);
        }
    }

    onLayoutChange = async () => {
        await this.updateSize();
    }

    public async componentWillUnmount() {
        // Unhook global events
        window.removeEventListener('resize', this.debounceResize);
        AppEvents.onRelayout.remove(this.onLayoutChange);

        // Dispose off-thread renderer
        this.renderer && await this.renderer.dispose();
    }

    public async componentDidUpdate(prevProps: Props) {
        let redraw: boolean | undefined = undefined;

        if (this.props.traces !== prevProps.traces) {
            const handles = this.props.traces.filter(t => t.active).map(t => t.handle);
            const [ from, to ] = this.props.xRange;

            const zoomRecommendation = this.props.traces.length > 0 ? dataWorker.recommend_extents(from, to, handles) : undefined;
            this.setState({ zoomRecommendation });

            if (zoomRecommendation !== undefined && this.props.zoom === undefined) {
                this.props.edit_graph({
                    id: this.props.id,
                    zoom: await zoomRecommendation
                });
            }

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

            await this.rebundle(toAdd, toDel, toMod);

            redraw = true;
            
            this.setState({
                ldevSelectAvailable: isHomogenous(this.props.traces) && getLdevMode(this.props.traces[0]) !== undefined
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

    private rebundle = async (toAdd: Trace[], toDel: number[], toMod: Trace[]): Promise<void> => {
        for (const bundle of this.renderer?.bundles ?? []) {
            const toAddHere = [] as Trace[]; // TODO: be smart about this and reduce number of traces for a new bundle
            const toDelHere = toDel.filter(r => bundle.traces.has(r));
            const toModHere = toMod.filter(r => bundle.traces.has(r.handle));

            if (toDelHere.length > 0) {
                console.trace(`rebundling ${bundle.handle}`);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const rebundle = this.renderer!.rebundle(bundle.handle, toAddHere.length, toDelHere.length, toModHere.length);

                toAddHere.forEach(t => rebundle.addTrace(t));
                toDelHere.forEach(t => rebundle.deleteTrace({ handle: t }));
                toModHere.forEach(t => rebundle.modifyTrace(t));

                try {
                    await rebundle.invoke();
                } catch (error) {
                    this.setState({ error });
                    return;
                }
            }
        }

        if (toAdd.length > 0) {
            try {
                await this.renderer?.createBundle(this.props.xRange, toAdd);
            } catch (error) {
                this.setState({ error });
                return;
            }
        }
    }

    private onRemove = () => {
        if (this.props.askClose) {
            DialogService.open(
                GraphDeleteConfirmation,
                res => {
                    if (res?.delete) {
                        this.props.remove_graphs(this.props.id);
                        if (res.ignoreNext) {
                            this.props.set_settings({ askGraphClose: false });
                        }
                    }
                },
                {
                    graphTitle: this.props.title,
                },
            );
        } else {
            this.props.remove_graphs(this.props.id);
        }
    }

    private onEdit = () =>
        DialogService.open(
            GraphEditModal,
            edit => edit && this.props.edit_graph({ ...edit, id: this.props.id }),
            { graph: this.props as Graph }
        );

    private onHide = () => this.props.hide_graphs(this.props.id);

    private updateSize = async () => {
        if (this.canvasRef.current) {
            const width  = this.canvasRef.current.clientWidth;
            const height = this.canvasRef.current.clientHeight;

            if (this.canvasRef.current && this.renderer && (this.state.clientWidth !== width || this.state.clientHeight !== height)) {
                this.setState({ clientWidth: width, clientHeight: height });

                await this.renderer.resize(width, height);
                await this.redrawGraph();
            }
        }
    }

    private debounceResize = debounce(this.updateSize, 300);

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

    public render() {
        const { title, traces } = this.props;
        const { error } = this.state;

        const pendingJobs = Object.values(this.props.jobs).filter(j => j.relatedGraphs.includes(this.props.id) && j.state === 'pending');
        const failedJobs  = Object.values(this.props.jobs).filter(j => j.relatedGraphs.includes(this.props.id) && j.state === 'error');

        const menuShow = useContextMenu({ id: `graph-${this.props.id}-menu` }).show;

        const onContextMenu = (e: MouseEvent) => {
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
                    {error && (<><div className='mt-3 text-danger'>{t('graph.error')}</div><div>{String(error)}</div></>)}
                    {traces.length <= 0 && (<div className='mt-3'>{t('graph.noTraces')}</div>)}
                    <canvas
                        ref={this.canvasRef}
                        width={this.state.clientWidth}
                        height={this.state.clientHeight}
                        // hidden={traces.length <= 0}
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
                    {!error && (
                        <GraphGui
                            id={this.props.id}
                            width={this.state.clientWidth}
                            height={this.state.clientHeight}
                            xTicks={this.state.xTicks}
                            yTicks={this.state.yTicks}
                            zoomRecommendation={this.state.zoomRecommendation}
                            onContextMenu={onContextMenu}
                        />
                    )}
                </div>
            </div>
        );
    }
}

export default connect(stateProps, dispatchProps)(GraphComponent);
