import React from 'react';
import { GraphContainer, Header, SideMenu, GraphComponent } from './components';
import { ModalPortal } from './components/Modals';

import './App.css';
import { connect } from 'react-redux';
import { add_graphs, remove_graphs, graph_action, ReduxProps } from './redux';

class App extends React.Component<AppProps, AppState> {
    public state: AppState = {
        locked: true,
        focused: -1,
    };

    toggleLock = (): void => this.setState({ locked: !this.state.locked });

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

    focusGraph = (e: React.MouseEvent<HTMLDivElement>): void => {
        const graphId = e.currentTarget.dataset.graph as string;

        this.setState({ focused: Number.parseInt(graphId) });
    }

    public render(): React.ReactNode {
        return (
            <>
                <Header
                    layoutUnlocked={!this.state.locked}
                    onToggleLock={this.toggleLock}
                />
                <SideMenu
                    selectedGraph={this.props.graphs.find(g => g.id === this.state.focused)}
                    onTraceAddClick={this.onTraceAddClick}
                />
                <GraphContainer locked={this.state.locked}>
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
}

const stateProps = (state: RootStore) => ({
    graphs: state.graphs.items,
});

const dispatchProps = {
    add_graphs,
    remove_graphs,
    graph_action,
};

export type AppProps = ReduxProps<typeof stateProps, typeof dispatchProps>;

export default connect(stateProps, dispatchProps)(App);