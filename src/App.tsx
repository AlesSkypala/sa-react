import React from 'react';
import { GraphContainer, Header, SideMenu, ContainerLayout, GraphComponent } from './components';
import { ModalPortal, ImportModal, TraceSearchModal } from './components/Modals';
import { ControlsService, DataService, DialogService } from './services';

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
            graphs: [...graphs, result],
            layout: [...this.state.layout, {
                i: String(result.id), x: 0, y: 0, w: 6, h: 4
            }]
        });
    }

    onAddTraces = (result: Trace[]) => {
        if (!result || !Array.isArray(result)) {
            return;
        }
        const graph = this.state.graphs.find(g => g.id === this.state.focused);

        if (graph) {
            graph.traces = [...graph.traces, ...result];
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
        res => res && this.setState({ graphs: [...this.state.graphs.filter(g => g.id !== id)] })
    );

    filterZero = async () => {
        const graph = this.state.graphs.find(g => g.id === this.state.focused);
        if (!graph) return;

        const remaining: Trace[] = [];

        const data = await DataService.getTraceData(graph.xRange[0], graph.xRange[1], graph.traces);

        for (const row of data) {
            if (! await row.isZero()) {
                remaining.push(row.trace);
            }
        }

        graph.traces = remaining;
        this.setState({ selectedTraces: [] });
    }

    filterCurves = async () => {
        const graph = this.state.graphs.find(g => g.id === this.state.focused);
        if (!graph) return;

        const filtered = graph.traces.filter(t => this.state.selectedTraces.indexOf(t.id) >= 0).map(t => ({ ...t, filtering: 'sg' } as Trace));
        graph.traces = [ ...graph.traces.filter(t => this.state.selectedTraces.indexOf(t.id) < 0), ...filtered ];
        this.setState({ selectedTraces: [] });
    }

    onTraceAction = (action: TraceAction) => {
        const graph = this.state.graphs.find(g => g.id === this.state.focused);

        if (!graph) return;

        switch (action) {
            case 'filter':
                this.filterCurves();
                break;
            case 'sel-unq':
                this.selectUnique();
                break;
            case 'search':
                DialogService.open(TraceSearchModal, traces => traces !== undefined && this.setState({ selectedTraces: traces }), { traces: graph.traces });
                break;
            case 'tres':
                // TODO:
                break;

            case 'sel-all':
                this.setState({ selectedTraces: graph.traces.map(t => t.id) });
                break
            case 'inv':
                this.setState({ selectedTraces: graph.traces.map(t => t.id).filter(t => this.state.selectedTraces.indexOf(t) < 0) });
                break;
            case 'des':
                this.setState({ selectedTraces: [] });
                break;
            case 'del-zero':
                this.filterZero();
                break;

            case 'sum':
                // TODO:
                break;
            case 'avg':
                // TODO:
                break;
            case 'del-unsel':
                if (this.state.selectedTraces.length > 0) {
                    graph.traces = graph.traces.filter(t => this.state.selectedTraces.indexOf(t.id) >= 0);
                    this.forceUpdate();
                }
                break;
            case 'sort':
                graph.traces = [ ...graph.traces.sort((a, b) => a > b ? 1 : (a === b ? 0 : -1)) ];
                this.forceUpdate();
                break;

            case 'name-sync':
                // TODO:
                break;
            case 'bind-sync':
                // TODO:
                break;
            case 'zoom-sync':
                this.zoomSync(graph.zoom);
                break;
        }
    };
    onTraceSelect = (id: string) => {
        const { selectedTraces } = this.state;
        const idx = selectedTraces.indexOf(id);

        if (idx < 0) {
            this.setState({ selectedTraces: [...selectedTraces, id] });
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
    selectUnique = () => {
        const graph = this.state.graphs.find(g => g.id === this.state.focused);
        if (!graph) return;

        const hashes = graph.traces.map(t => DataService.getTraceHash(t));
        const newSel: string[] = [];
        for (let a = hashes.length - 1; a >= 0; --a) {
          let occured = false;

          for (let b = 0; b < a; ++b) {
            if (hashes[b] === hashes[a]) {
              occured = true;
              break;
            }
          }

          if (!occured) {
            newSel.push(graph.traces[a].id);
          }
        }
        this.setState({ selectedTraces: newSel });
    }
    onZoomUpdated = (id: number, zoom: [[Date, Date], [any, any]]) => {
        const graph = this.state.graphs.find(g => g.id === id);
        if (!graph) return;

        graph.zoom = zoom;
        this.forceUpdate();
    }
    zoomSync = (zoom: Graph['zoom']) => {
        for (const graph of this.state.graphs) {
            graph.zoom = zoom ? [ ...zoom ] : [ undefined, undefined ];
        }

        this.forceUpdate();
    };

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
                            <GraphComponent
                                {...g}
                                focused={g.id === this.state.focused}
                                onRemove={this.onRemoveGraph}
                                onZoomUpdated={this.onZoomUpdated}
                            />
                        </div>
                    ))}
                </GraphContainer>
                <ModalPortal />
            </>
        );
    }
}

export interface AppState {
    locked: boolean;
    focused: Graph['id'];
    selectedTraces: Trace['id'][];

    graphs: Graph[];
    layout: ContainerLayout;
}

export default App;
