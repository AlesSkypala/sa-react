import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faWrench } from '@fortawesome/free-solid-svg-icons';
import * as React from 'react';
import debounce from 'lodash.debounce';
import { transfer } from 'comlink';
import { plotWorker } from '..';
import { Spinner } from 'react-bootstrap';

import './Graph.css';
import { GraphExtents } from '../plotting';
import { AppEvents } from '../services';

class GraphComponent
    extends React.Component<GraphProps, State> {

    public state: State = {
        revision: 0,
        rendering: false,
    }

    private contentRef: React.RefObject<HTMLDivElement> = React.createRef();
    private canvasRef: React.RefObject<HTMLCanvasElement> = React.createRef();
    private rendererUid: string | undefined;
    private traces: { id: Trace['id'], ptr: number }[] = [];

    private extents: Omit<GraphExtents, 'free'> = { x_start: 0, x_end: 0, y_start: 0, y_end: 0 };

    redrawGraph = async () => {
        if (!this.rendererUid) return;
        
        this.setState({ rendering: true });
        const trace_ptrs = this.traces.filter(t => this.props.activeTraces.indexOf(t.id) >= 0).map(t => t.ptr);
        await plotWorker.clearChart(this.rendererUid);
        await plotWorker.renderTraces(this.rendererUid, trace_ptrs.map(p => ({ ptr: p, color: [0,0,0] })));

        this.traces.length > 0 && this.setState({ rendering: false });
    }

    public async componentDidMount() {
        this.componentDidUpdate({ ...this.props, traces: [] });
        window.addEventListener('resize', this.debounceResize);
        AppEvents.onRelayout.on(this.onLayoutChange);

        const canvas = this.canvasRef.current;

        if (canvas) {
            const offscreen = canvas.transferControlToOffscreen();
    
            this.rendererUid = await plotWorker.createOffscreen(
                transfer(offscreen, [ offscreen ]),
                this.props.xType ?? 'datetime',
                this.extents = {
                    x_start: 0,
                    x_end: 1e10,
                    y_start: 0,
                    y_end: 1e3
                },
                {
                    margin: 5,
                    x_label_space: 24,
                    y_label_space: 60,
                }
            );
    
            await this.updateSize();
        }
    }

    onLayoutChange = async () => {
        await this.updateSize();
    }

    public async componentWillUnmount() {
        window.removeEventListener('resize', this.debounceResize);
        AppEvents.onRelayout.remove(this.onLayoutChange);
        this.rendererUid && await plotWorker.disposeOffscreen(this.rendererUid);
    }

    public async componentDidUpdate(prevProps: GraphProps) {
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

                const { x_start, x_end, y_start, y_end } = await plotWorker.getExtentRecommendation(this.traces.map(l => l.ptr));
                this.rendererUid && plotWorker.callRendererFunc(this.rendererUid, 'set_extents', [
                    this.extents = { x_start, x_end, y_start, y_end } as GraphExtents
                ]);
                await this.redrawGraph();
            }
        }

        if (this.props.layoutLocked !== prevProps.layoutLocked && this.props.layoutLocked) {
            await this.updateSize();
        }

        if (this.props.activeTraces !== prevProps.activeTraces) {
            await this.redrawGraph();
        }
    }

    private onRemove = () => this.props.onRemove && this.props.onRemove(this.props.id);
    private onEdit   = () => this.props.onEdit && this.props.onEdit(this.props.id);

    private prevWidth = 0;
    private prevHeight = 0;
    private updateSize = async () => {
        if (this.contentRef.current) {
            const width = this.contentRef.current.clientWidth;
            const height = this.contentRef.current.clientHeight;

            if (this.canvasRef.current && this.rendererUid && (this.prevWidth !== width || this.prevHeight !== height)) {
                await plotWorker.callRendererFunc(this.rendererUid, 'resize', [width, height]);
                await this.redrawGraph();
            }

            this.prevWidth = width;
            this.prevHeight = height;
        }
    }

    private debounceResize = debounce(this.updateSize, 300);

    public render() {
        const { title, traces } = this.props;

        return (
            <div className={`graph ${this.props.focused ? 'active' : ''}`}>
                <div className='text-center position-relative'>
                    <h4 className='mt-1 w-100 text-center'>{title}</h4>
                    <div style={{ right: 0, top: 0, bottom: 0 }} className='d-flex align-items-center position-absolute buttons'>
                        <button className='btn btn-sm' onClick={this.onEdit}><FontAwesomeIcon icon={faWrench} /></button>
                        <button className='btn btn-sm' onClick={this.onRemove}><FontAwesomeIcon icon={faTrash} /></button>
                    </div>
                </div>
                <div className='graph-content' ref={this.contentRef}>
                    {traces.length <= 0 && (<div>Graf nemá žádné křivky</div>)}
                    <canvas ref={this.canvasRef} hidden={traces.length <= 0} />
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

export interface GraphProps
extends Graph {
    focused?: boolean;
    layoutLocked: boolean;

    onZoomUpdated?(id: Graph['id'], zoom: Graph['zoom']): void;
    onEdit?(id: Graph['id']): void;
    onRemove?(id: Graph['id']): void;
}

export interface State {
    revision: number;
    rendering: boolean;
}

export default GraphComponent;