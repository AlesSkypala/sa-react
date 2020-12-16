import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import * as React from 'react';
import createPlotlyComponent from 'react-plotly.js/factory';
import {  DataService } from '../services';
import Plotly from 'plotly.js-gl2d-dist';
import { Data as PlotlyData, PlotRelayoutEvent, LayoutAxis, PlotMouseEvent } from 'plotly.js';

import './Graph.css';

const Plot = createPlotlyComponent(Plotly);

class GraphComponent
extends React.Component<GraphProps, State> {

    public state: State = {
        revision: 0,
        loadedData: [],
        width: 0,
        height: 0,
    }

    private contentRef: React.RefObject<HTMLDivElement> = React.createRef();

    public componentDidMount() {
        this.componentDidUpdate({ ...this.props, traces: [] }, this.state);
        window.addEventListener('resize', this.updateSize);
        this.updateSize();
    }

    public componentWillUnmount() {
        window.removeEventListener('resize', this.updateSize);
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
                const plotly = await Promise.all(traceData.map(d => d.toPlotly()));
                const newStateTraces = [ ...this.state.loadedData ];

                for (let i = 0; i < plotly.length; ++i) {
                    const trace = traceData[i].trace;
                    const idx = newStateTraces.findIndex(d => d.id === trace.id);

                    if (idx >= 0) {
                        newStateTraces[idx].x = plotly[i].x;
                        newStateTraces[idx].y = plotly[i].y;
                    } else {
                        newStateTraces.push({
                            id: trace.id,
                            type: 'scattergl',
                            name: trace.title,
                            mode: 'lines+markers',
                            ...plotly[i],
                        });
                    }
                }

                this.setState({ loadedData: newStateTraces, revision: ++this.state.revision });
            }
        }

        if (this.props.layoutLocked !== prevProps.layoutLocked && this.props.layoutLocked) {
            this.updateSize();
        }
    }

    private onRemove = () => this.props.onRemove && this.props.onRemove(this.props.id);
    private updateSize = () => {
        this.contentRef.current && this.setState({ width: this.contentRef.current.clientWidth, height: this.contentRef.current.clientHeight });
    }

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

    onGraphClick = (event: Readonly<PlotMouseEvent>) => {
        console.log(event.points);
    }

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
                    <DumbGraph
                        id={this.props.id}
                        zoom={this.props.zoom}
                        xLabel={this.props.xLabel}
                        yLabel={this.props.yLabel}

                        revision={this.state.revision}
                        width={this.state.width}
                        height={this.state.height}

                        onRelayout={this.onRelayout}
                        data={this.state.loadedData}
                    />
                )}
                </div>
                {!this.props.layoutLocked && (<div className='graph-resize-overlay'><h3>Graf se překreslí po uzamknutí rozložení...</h3></div>)}
            </div>
        );
    }
}

class DumbGraph
extends React.PureComponent<{ revision: number, width: number, height: number, onRelayout: any, data: any } & Pick<Graph, 'id' | 'zoom' | 'xLabel' | 'yLabel'>> {

    public render() {
        const { id, width, height, xLabel, yLabel } = this.props;
        const zoom = this.props.zoom || [ undefined, undefined ];
        
        const xaxis: Partial<LayoutAxis> = { ...(zoom[0] ? { range: zoom[0] } : { autorange: true }), title: xLabel };
        const yaxis: Partial<LayoutAxis> = { ...(zoom[1] ? { range: zoom[1] } : { autorange: true }), title: yLabel };

        return ( 
            <Plot
                divId={`graph-${id}`}
                config={{
                    responsive: true,
                    displaylogo: false,
                    modeBarButtonsToRemove: [ 'select2d', 'lasso2d' ],
                    
                }}
                layout={{
                    xaxis,
                    yaxis,
                    margin: { l: 48, t: 32, r: 16, b: 48 },
                    hovermode: false,
                    showlegend: true,

                    width: width,
                    height: height,
                }}
                revision={this.props.revision}

                onRelayout={this.props.onRelayout}
                data={this.props.data}
            />
        );
    }
}

export interface GraphProps
extends Graph {
    focused?: boolean;
    layoutLocked: boolean;

    onZoomUpdated?(id: Graph['id'], zoom: Graph['zoom']): void;
    onRemove?(id: Graph['id']): void;
}

export interface State {
    revision: number;
    loadedData: (PlotlyData & { id: string })[];

    width: number;
    height: number;
}

export default GraphComponent;