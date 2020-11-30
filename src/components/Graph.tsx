import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import * as React from 'react';
import createPlotlyComponent from 'react-plotly.js/factory';
import {  DataService } from '../services';
import AutoSizer from 'react-virtualized-auto-sizer';
import Plotly from 'plotly.js-gl2d-dist';
import { Figure } from 'react-plotly.js';
import { Data as PlotlyData, PlotRelayoutEvent } from 'plotly.js';

import './Graph.css';

const Plot = createPlotlyComponent(Plotly);

class GraphComponent
extends React.Component<GraphProps, State> {
    // private figure?: Readonly<Figure> = undefined;
    // private plotlyElem?: Readonly<HTMLElement> = undefined;

    public state: State = {
        revision: 0,
        loadedData: [],
    }
    public componentDidMount() {
        this.componentDidUpdate({ ...this.props, traces: [] }, this.state);
    }

    public async componentDidUpdate(prevProps: GraphProps, prevState: State) {
        if (this.props.traces !== prevProps.traces) {
            const newTraces: Trace[] = this.props.traces.filter(t => prevProps.traces.indexOf(t) < 0);
            const removedTraces: Trace[] = prevProps.traces.filter(t => this.props.traces.indexOf(t) < 0);
    
            this.setState({ loadedData: this.state.loadedData.filter(d => removedTraces.findIndex(t => t.id === d.id) < 0) });
            if (removedTraces.length > 0) {
                this.setState({ revision: ++this.state.revision });
            }
    
            if (newTraces.length > 0) {

                const traceData = await DataService.getTraceData(this.props.xRange[0], this.props.xRange[1], newTraces);
                await Promise.all(traceData.slice(0, 50).map((t, i) => t.toPlotly().then(r => {
                    const trace = newTraces[i];
                    const idx = this.state.loadedData.findIndex(d => d.id === trace.id);
        
                    if (idx >= 0) {
                        this.state.loadedData[idx].x = r.x;
                        this.state.loadedData[idx].y = r.y;
                    } else {
                        this.setState({ loadedData: [ ...this.state.loadedData, {
                            id: trace.id,
                            type: 'scattergl',
                            name: trace.title,
                            mode: 'lines+markers',
                            ...r,
                        } ],
                            revision: ++this.state.revision
                        });
                    }
                })));
            }
        }
    }

    private onRemove = () => this.props.onRemove && this.props.onRemove(this.props.id);

    onRelayout = (event: Readonly<PlotRelayoutEvent>) => {
        const zoom: Graph['zoom'] = [ undefined, undefined ];

        if ('xaxis.range[0]' in event) {
            zoom[0] = [ event['xaxis.range[0]'] as any, event['xaxis.range[1]'] as any ];
        } else if (!(event['xaxis.autorange'] || false)) {
            zoom[0] = this.props.zoom && this.props.zoom[0] ? [ ...this.props.zoom[0] ] : undefined;
        }

        if ('yaxis.range[0]' in event) {
            zoom[1] = [ event['yaxis.range[0]'] as any, event['yaxis.range[1]'] as any ];
        } else if (!(event['yaxis.autorange'] || false)) {
            zoom[1] = this.props.zoom && this.props.zoom[1] ? [ ...this.props.zoom[1] ] : undefined;
        }

        this.props.onZoomUpdated && this.props.onZoomUpdated(this.props.id, zoom);
    }

    public render() {
        const { title, traces, xLabel, yLabel } = this.props;
        const zoom = this.props.zoom || [ undefined, undefined ];

        return (
            <div className={`graph ${this.props.focused ? 'active' : ''}`}>
                <div className='text-center position-relative'>
                    <h1 className='w-100 text-center'>{title}</h1>
                    <div style={{ right: 0, top: 0 }} className='position-absolute buttons'>
                        <button className='btn btn-lg' onClick={this.onRemove}><FontAwesomeIcon icon={faTrash} /></button>
                    </div>
                </div>
                <div className='graph-content'>
                {traces.length <= 0 ?(
                    <div>Graf nemá žádné křivky</div>
                    ) : (
                    <AutoSizer>
                    {({height, width}) => (
                    <Plot
                        divId={`graph-${this.props.id}`}
                        config={{
                            responsive: true,
                            displaylogo: false,
                            modeBarButtonsToRemove: [ 'select2d', 'lasso2d' ],
                        }}
                        layout={{
                            xaxis: { title: xLabel, range: zoom[0], autorange: !zoom[0] },
                            yaxis: { title: yLabel, range: zoom[1], autorange: !zoom[1] },
                            margin: { l: 48, t: 32, r: 16, b: 48 },
                            hovermode: false,

                            width,
                            height,
                        }}
                        revision={this.state.revision}
                        // onInitialized={this.onInitialized}
                        // onUpdate={this.onAfterPlot}
                        onRelayout={this.onRelayout}
                        data={this.state.loadedData}
                    />
                    )}
                    </AutoSizer>
                )}
                </div>
            </div>
        );
    }
}

export interface GraphProps
extends Graph {
    focused?: boolean;

    onZoomUpdated?(id: Graph['id'], zoom: Graph['zoom']): void;
    onRemove?(id: Graph['id']): void;
}

export interface State {
    revision: number;
    loadedData: (PlotlyData & { id: string })[];
}

export default GraphComponent;