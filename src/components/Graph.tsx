import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import * as React from 'react';
import createPlotlyComponent from 'react-plotly.js/factory';
import { ControlsService, DataService, Deserialization } from '../services';
import AutoSizer from 'react-virtualized-auto-sizer';
import Plotly from 'plotly.js-gl2d-dist';
import { Figure } from 'react-plotly.js';
import { Data as PlotlyData } from 'plotly.js';

import './Graph.css';

const Plot = createPlotlyComponent(Plotly);

class GraphComponent
extends React.Component<GraphProps, State> {
    private figure?: Readonly<Figure> = undefined;
    private plotlyElem?: Readonly<HTMLElement> = undefined;

    public state: State = {
        revision: 0,
        loadedData: [],
    }

    public componentDidMount() {
        ControlsService.zoomSync.on(this.onZoomSync);
        this.componentDidUpdate({ ...this.props, traces: [] }, this.state);
    }

    public componentWillUnmount() {
        ControlsService.zoomSync.remove(this.onZoomSync);
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
                await Promise.all(traceData.slice(0, 50).map((t, i) => Deserialization.deserializePlotly(t[0], t[1]).then(r => {
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

    private onZoomSync = (zoom: Graph['zoom']) => this.setState({ zoom });
    private onRemove = () => this.props.onRemove && this.props.onRemove(this.props.id);

    private onInitialized = (figure: Readonly<Figure>, elem: Readonly<HTMLElement>) => {
        this.figure = figure;
        this.plotlyElem = elem;
    }

    private onAfterPlot = () => {
        this.props.onZoomUpdated && this.props.onZoomUpdated(this.props.id, [
            this.figure!.layout!.xaxis!.range!.map(a => new Date(a)) as [Date, Date],
            this.figure!.layout!.yaxis!.range as [any, any]
        ]);
    }

    public render() {
        const { title, traces, xLabel, yLabel } = this.props;

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
                            xaxis: { title: xLabel, range: this.state.zoom && this.state.zoom[0] },
                            yaxis: { title: yLabel, range: this.state.zoom && this.state.zoom[1] },
                            margin: { l: 48, t: 32, r: 16, b: 48 },
                            hovermode: false,

                            width,
                            height,
                        }}
                        revision={this.state.revision}
                        onInitialized={this.onInitialized}
                        onAfterPlot={this.onAfterPlot}
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

    zoom?: Graph['zoom'];
}

export default GraphComponent;