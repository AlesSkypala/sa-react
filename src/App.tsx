import React from 'react';
import { GraphContainer, Header, SideMenu, GraphComponent } from './components';
import { ModalPortal, AddGraphModal, GraphEditModal, ConfirmModal } from './components/Modals';
import { DialogService } from './services';

import './App.css';
import { GlobalHotKeys } from 'react-hotkeys';
import { plotWorker } from '.';
import { connect } from 'react-redux';
import { add_graphs, remove_graphs, graph_action, ReduxProps } from './redux';

class App extends React.Component<AppProps, AppState> {
    public state: AppState = {
        locked: true,
        focused: -1,
        threshold: false,
    };

    toggleLock = (): void => this.setState({ locked: !this.state.locked });
    addGraph = () => 
        DialogService.open(
            AddGraphModal,
            res => res && this.props.add_graphs(res),
            {}
        );

    onTraceAddClick = (): void => {
        // TODO:
        // ! regression
        // DialogService.open(ImportModal, this.onAddTraces, { isGraph: false });
    }

    onAddTraces = (result: Trace[]): void => {
        if (!result || !Array.isArray(result)) {
            return;
        }
        const graph = this.props.graphs.find(g => g.id === this.state.focused);

        if (graph) {
            // graph.traces = [...graph.traces, ...result];
            this.forceUpdate();
        }
    }

    // onRelayout = (layout: ContainerLayout): void => this.setState({ layout });
    focusGraph = (e: React.MouseEvent<HTMLDivElement>): void => {
        const graphId = e.currentTarget.dataset.graph as string;

        this.setState({ focused: Number.parseInt(graphId) });
    }   

    onTraceSelect = (id: string): void => {
        const graph = this.props.graphs.find(g => g.id === this.state.focused);

        if (!graph) {
            return;
        }

        // const idx = graph.activeTraces.indexOf(id);

        // if (idx < 0) {
        //     graph.activeTraces = [ ...graph.activeTraces, id ];
        // } else {
        //     graph.activeTraces = [ ...graph.activeTraces.slice(0, idx), ...graph.activeTraces.slice(idx + 1) ];
        // }
        // this.forceUpdate();
    };
    onGraphPropChange = (key: keyof Graph, value: Graph[keyof Graph]): void => {
        const graph = this.props.graphs.find(g => g.id === this.state.focused);

        if (graph) {
            // graph[key] = value as never;
            this.forceUpdate();
        }
    };
    onZoomUpdated = (id: number, zoom: Graph['zoom']): void => {
        const graph = this.props.graphs.find(g => g.id === id);
        if (!graph) return;

        // graph.zoom = zoom;
        // this.forceUpdate();
    }
    // onThresholdSelected = (val: unknown) => {
    //     if (!this.state.threshold) return;
    //     this.selectAboveTreshold(val as number);
    //     this.setState({ threshold: false });
    // }
    onClone = (id: Graph['id'], active: boolean) => {
        const graph = this.props.graphs.find(g => g.id === id);
        if (!graph) return;

        this.props.add_graphs([
            {
                ...graph,
                xRange: [ ...graph.xRange],
                zoom: graph.zoom ? [ ...graph.zoom ] : undefined,
                activeTraces: [ ...graph.activeTraces ],
                traces: (active ? graph.traces.filter(g => graph.activeTraces.includes(g.id)) : graph.traces)
                    .map(t => ({ ...t, pipeline: { ...t.pipeline }})),
            }
        ]);
    }

    public render(): React.ReactNode {
        return (
            <>
                <Header
                    layoutUnlocked={!this.state.locked}
                    onToggleLock={this.toggleLock}
                    onAddGraph={this.addGraph}
                    // onLayout={this.onLayoutChange}
                />
                <SideMenu
                    selectedGraph={this.props.graphs.find(g => g.id === this.state.focused)}
                    onTraceAddClick={this.onTraceAddClick}
                />
                <GraphContainer
                    layout={this.props.layout}
                    locked={this.state.locked}
                    // onLayoutChange={this.onRelayout}
                >
                    {this.props.graphs.map(g => (
                        <div
                            key={g.id}
                            data-graph={g.id}
                            onClick={this.focusGraph}
                        >
                            <GraphComponent
                                id={g.id}
                                focused={g.id === this.state.focused}
                                layoutLocked={this.state.locked}
                            />
                        </div>
                    ))}
                </GraphContainer>
                <ModalPortal />
                <div id="context-menu"></div>
                {/* <GlobalHotKeys keyMap={{ SEL_ALL: 'ctrl+a', SEL_INV: 'ctrl+i', DEL_TRACE: 'del' }} handlers={{ DEL_TRACE: () => this.onTraceAction('del-sel'), SEL_ALL: () => this.onTraceAction('sel-all'), SEL_INV: () => this.onTraceAction('inv') }} /> */}
            </>
        );
    }
}

export interface AppState {
    locked: boolean;
    focused: Graph['id'];
    threshold: boolean;
}

const stateProps = (state: RootStore) => ({
    graphs: state.graphs.items,
    layout: state.graphs.layout,
});

const dispatchProps = {
    add_graphs,
    remove_graphs,
    graph_action,
};

export type AppProps = ReduxProps<typeof stateProps, typeof dispatchProps>;

export default connect(stateProps, dispatchProps)(App);