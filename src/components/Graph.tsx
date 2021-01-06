import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import * as React from 'react';
import { AutoSizer } from 'react-virtualized';
import TraceData from '../services/TraceData';

import {  DataService } from '../services';
import type { GraphRenderer } from '../plotting';
import './Graph.css';
import debounce from 'lodash.debounce';

const plotting = import('../plotting');

class GraphComponent
extends React.Component<GraphProps, State> {

    public state: State = {
        revision: 0,
    }

    private contentRef: React.RefObject<HTMLDivElement> = React.createRef();
    private graphRenderer: GraphRenderer | undefined;
    private traces: TraceData[] = [];

    redrawGraph = () => {
        if (this.graphRenderer) {
            const n = performance.now();

            this.graphRenderer.clear();
            this.graphRenderer.draw_chart();
            for (const trace of this.traces) {
                trace.render(this.graphRenderer);
            }

            console.log(`rendered ${this.traces.length} traces with the total of ${24 * 60 * this.traces.length} points in ${(performance.now() - n)}`);
        }
    }

    public componentDidMount() {
        this.componentDidUpdate({ ...this.props, traces: [] }, this.state);
        window.addEventListener('resize', this.debounceResize);

        plotting.then(
            wasm => {
                this.graphRenderer = new wasm.GraphRenderer(`gcanvas-${this.props.id}`, 0, 1e10, 0, 1e3);
                this.updateSize();
            }
        );
    }

    public componentWillUnmount() {
        window.removeEventListener('resize', this.debounceResize);
    }

    public async componentDidUpdate(prevProps: GraphProps, prevState: State) {
        if (this.props.traces !== prevProps.traces) {
            const newTraces: Trace[] = this.props.traces.filter(t => prevProps.traces.indexOf(t) < 0);
            const removedTraces: Trace[] = prevProps.traces.filter(t => this.props.traces.indexOf(t) < 0);
    
            if (removedTraces.length > 0) {
                this.traces = this.traces.filter(d => removedTraces.findIndex(t => t.id === d.trace.id) < 0);

                newTraces.length <= 0 && this.redrawGraph();
            }
    
            if (newTraces.length > 0) {
                let rerange = this.traces.length <= 0;
                const loaded = await DataService.getTraceData(this.props.xRange[0], this.props.xRange[1], newTraces);
                this.traces.push(...loaded);

                this.graphRenderer?.set_extents(TraceData.getRecommendation(...loaded));
                this.redrawGraph();
            }
        }

        if (this.props.layoutLocked !== prevProps.layoutLocked && this.props.layoutLocked) {
            this.updateSize();
        }
    }

    private onRemove = () => this.props.onRemove && this.props.onRemove(this.props.id);
    private updateSize = () => {
        if (this.contentRef.current) {
            const width = this.contentRef.current.clientWidth;
            const height = this.contentRef.current.clientHeight;

            if (this.graphRenderer) {
                this.graphRenderer.resize(width, height);

                this.redrawGraph();
            }
        }
    }

    private debounceResize = debounce(this.updateSize, 300);

    public render() {
        const { title, traces } = this.props;

        return (
            <div className={`graph ${this.props.focused ? 'active' : ''}`}>
                <div className='text-center position-relative'>
                    <h1 className='w-100 text-center'>{title}</h1>
                    <div style={{ right: 0, top: 0 }} className='position-absolute buttons'>
                        <button className='btn btn-lg' onClick={this.onRemove}><FontAwesomeIcon icon={faTrash} /></button>
                    </div>
                </div>
                <div className='graph-content' ref={this.contentRef}>
                {traces.length <= 0 ?(
                    <div>Graf nemá žádné křivky</div>
                    ) : (
                    <AutoSizer>
                    {({width, height}) => (
                        <canvas id={`gcanvas-${this.props.id}`} width={width} height={height} />
                    )}
                    </AutoSizer>
                )}
                </div>
                {!this.props.layoutLocked && (<div className='graph-resize-overlay'><h3>Graf se překreslí po uzamknutí rozložení...</h3></div>)}
            </div>
        );
    }
}

// class DumbGraph
// extends React.PureComponent<{ revision: number, width: number, height: number, onRelayout: any, data: any } & Pick<Graph, 'id' | 'zoom' | 'xLabel' | 'yLabel'>> {

//     public render() {
//         const { id, width, height, xLabel, yLabel } = this.props;
//         const zoom = this.props.zoom || [ undefined, undefined ];
        
//         const xaxis: Partial<LayoutAxis> = { ...(zoom[0] ? { range: zoom[0] } : { autorange: true }), title: xLabel };
//         const yaxis: Partial<LayoutAxis> = { ...(zoom[1] ? { range: zoom[1] } : { autorange: true }), title: yLabel };

//         return ( 
//             <Plot
//                 divId={`graph-${id}`}
//                 config={{
//                     responsive: true,
//                     displaylogo: false,
//                     modeBarButtonsToRemove: [ 'select2d', 'lasso2d' ],
                    
//                 }}
//                 layout={{
//                     xaxis,
//                     yaxis,
//                     margin: { l: 48, t: 32, r: 16, b: 48 },
//                     hovermode: false,
//                     showlegend: true,

//                     width: width,
//                     height: height,
//                 }}
//                 revision={this.props.revision}

//                 onRelayout={this.props.onRelayout}
//                 data={this.props.data}
//             />
//         );
//     }
// }

export interface GraphProps
extends Graph {
    focused?: boolean;
    layoutLocked: boolean;

    onZoomUpdated?(id: Graph['id'], zoom: Graph['zoom']): void;
    onRemove?(id: Graph['id']): void;
}

export interface State {
    revision: number;
}

export default GraphComponent;