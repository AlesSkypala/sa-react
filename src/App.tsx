import React from 'react';
import { GraphContainer, Header, SideMenu, ContainerLayout, GraphComponent } from './components';
import { ModalPortal, ImportModal } from './components/Modals';
import { DialogService } from './services';

import './App.css';

class App
extends React.Component<{}, AppState> {
    public state: AppState = {
        locked: true,
        focused: -1,
        selectedTraces: [],

        graphs: [],
        layout: [],
    };

    toggleLock = () => this.setState({ locked: !this.state.locked });
    addGraph = () => DialogService.open(ImportModal, this.onAddGraph, { isGraph: true });

    onAddGraph = (result: Graph) => {
        if (!result) { return; }

        const { graphs } = this.state;
        
        result.id = graphs.length > 0 ? Math.max(...graphs.map(g => g.id)) + 1 : 0;
        this.setState({
            graphs: [ ...graphs, result ],
            layout: [ ...this.state.layout, {
                i: String(result.id), x:0, y: 0, w: 6, h: 4
            }]
        });
    }

    onAddTraces = (result: Trace[]) => {
        if (!result || !Array.isArray(result)) {
            return;
        }
        const graph = this.state.graphs.find(g => g.id === this.state.focused);

        if (graph) {
            graph.traces = [ ...graph.traces, ...result ];
            this.forceUpdate();
        }
    }

    onRelayout = (layout: ContainerLayout) => this.setState({ layout });
    focusGraph = (e: React.MouseEvent<HTMLDivElement>) => {
        const graphId = e.currentTarget.dataset.graph as string;

        this.setState({ focused: Number.parseInt(graphId), selectedTraces: [] });
    }
    onRemoveGraph = (id: number) => DialogService.openConfirmation(
            {
                title: `Smazat graf ${this.state.graphs.find(g => g.id === id)?.title || 'unkown'}`,
                body: 'Opravdu chcete tento graf smazat?',
                okColor: 'danger',
            },
            res => res && this.setState({ graphs: [ ...this.state.graphs.filter(g => g.id !== id) ]})
        );

    onTraceAction = (action: TraceAction) => { };
    onTraceSelect = (id: string) => {
        const { selectedTraces } = this.state;
        const idx = selectedTraces.indexOf(id);

        if (idx < 0) {
            this.setState({ selectedTraces: [ ...selectedTraces, id ] });
        } else {
            selectedTraces.splice(idx, 1);
            this.setState({ selectedTraces: [...selectedTraces] });
        }
    };
    onGraphPropChange = (key: keyof Graph, value: Graph[keyof Graph]) => {
        const graph = this.state.graphs.find(g => g.id === this.state.focused);

        if (graph) {
            graph[key] = value as never;
            this.forceUpdate();
        }
    };
    onTraceAddClick = () => DialogService.open(ImportModal, this.onAddTraces, { isGraph: false });

    public render() {
        return (
            <>
                <Header
                    layoutUnlocked={!this.state.locked}
                    onToggleLock={this.toggleLock}
                    onAddGraph={this.addGraph}
                />
                <SideMenu
                    selectedGraph={this.state.graphs.find(g => g.id === this.state.focused)}
                    selectedTraces={this.state.selectedTraces}
                    onGraphPropChange={this.onGraphPropChange}
                    onTraceAction={this.onTraceAction}
                    onTraceSelect={this.onTraceSelect}
                    onTraceAddClick={this.onTraceAddClick}
                />
                <GraphContainer
                    layout={this.state.layout}
                    locked={this.state.locked}
                    onLayoutChange={this.onRelayout}
                >
                    {this.state.graphs.map(g => (
                        <div
                            key={String(g.id)}
                            data-graph={g.id}
                            onClick={this.focusGraph}
                        >
                            <GraphComponent {...g} focused={g.id === this.state.focused} onRemove={this.onRemoveGraph} />
                        </div>
                    ))}
                </GraphContainer>
                <ModalPortal />
            </>
        );
    }
}

// TODO: trace import and graph creation modal
// TODO: LDEV map modal

export interface AppState {
    locked: boolean;
    focused: Graph['id'];
    selectedTraces: Trace['id'][];
    
    graphs: Graph[];
    layout: ContainerLayout;
}

export default App;
