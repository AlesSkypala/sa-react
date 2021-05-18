import React from 'react';
import { GraphContainer, Header, SideMenu, GraphComponent } from './components';
import { ModalPortal } from './components/Modals';

import './App.css';
import { connect } from 'react-redux';
import { add_graphs, remove_graphs, graph_action, set_settings, hide_graphs, ReduxProps } from './redux';
import { GlobalHotKeys } from 'react-hotkeys';
import { t } from './locale';
import { AppSettings } from './redux/settings';


export interface AppState {
    locked: boolean;
    focused: Graph['id'] | undefined;
}

const stateProps = (state: RootStore) => ({
    graphs: state.graphs.items,
    maxActive: state.settings.activeContexts,
    settings: state.settings,
});

const dispatchProps = {
    add_graphs,
    remove_graphs,
    graph_action,
    set_settings,
    hide_graphs,
};

export type AppProps = ReduxProps<typeof stateProps, typeof dispatchProps>;

class App extends React.Component<AppProps, AppState> {
    public state: AppState = {
        locked: true,
        focused: undefined,
    };

    constructor(props: AppProps) {
        super(props);

        const saved = localStorage.getItem('settings');
        if (saved) {
            const settings = JSON.parse(saved) as Partial<AppSettings>;
            props.set_settings(settings);
        }
    }

    public componentDidMount() {
        window.addEventListener('beforeunload', this.handleUnload);
    }

    public componentWillUnmount() {
        window.removeEventListener('beforeunload', this.handleUnload);
    }

    public componentDidUpdate() {
        const visible = this.props.graphs.filter(g => g.visible);

        if (visible.length > this.props.maxActive) {
            this.props.hide_graphs(visible.slice(0, visible.length - this.props.maxActive).map(v => v.id));
        }
    }

    handleUnload = (e: BeforeUnloadEvent) => {
        localStorage.setItem('settings', JSON.stringify(this.props.settings));

        if (this.props.graphs.length > 0) {
            e.preventDefault();
            e.returnValue = t('unsavedWork');
        }
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

        this.setState({ focused: graphId });
    }

    public render(): React.ReactNode {
        // const graph = this.props.graphs.find(g => g.id === this.state.focused);
        const makeAction = (action: TraceAction) => () => this.state.focused && this.props.graph_action({ id: this.state.focused, action });

        const visibleGraphs = this.props.graphs.filter(g => g.visible).slice(0, this.props.maxActive);

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
                    {visibleGraphs.map(g => (
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
                <GlobalHotKeys
                    keyMap={{ SEL_ALL: 'ctrl+a', SEL_INV: 'ctrl+i', DEL_TRACE: 'del' }}
                    handlers={{
                        DEL_TRACE: makeAction('del-sel'),
                        SEL_ALL:   makeAction('sel-all'),
                        SEL_INV:   makeAction('inv')
                    }}
                />
            </>
        );
    }
}

export default connect(stateProps, dispatchProps)(App);
