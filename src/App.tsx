import React from 'react';
import { GraphContainer, Header, SideMenu, GraphComponent } from './components';
import { ModalPortal } from './components/Modals';

import { connect, ReduxProps, add_graphs, remove_graphs, graph_action, set_settings, hide_graphs, focus_graph } from './redux';
import { GlobalHotKeys } from 'react-hotkeys';
import { t } from './locale';
import { AppSettings } from './redux/settings';
import Helmet from 'react-helmet';
import { ToastContainer } from 'react-toastify';


export interface AppState {
    locked: boolean;
    hasError: boolean,
}

const stateProps = (state: RootStore) => ({
    graphs: state.graphs.items,
    focused: state.graphs.focused,
    maxActive: state.settings.activeContexts,
    darkMode: state.settings.darkMode,
    settings: state.settings,
});

const dispatchProps = {
    add_graphs,
    remove_graphs,
    graph_action,
    set_settings,
    hide_graphs,
    focus_graph
};

export type AppProps = ReduxProps<typeof stateProps, typeof dispatchProps>;

class App extends React.Component<AppProps, AppState> {
    public state: AppState = {
        hasError: false,
        locked: true
    };

    constructor(props: AppProps) {
        super(props);

        const saved = localStorage.getItem('settings');
        if (saved) {
            const settings = JSON.parse(saved) as Partial<AppSettings>;
            if (settings.favoriteDatasets) { settings.favoriteDatasets = settings.favoriteDatasets.filter(d => d.per); }

            props.set_settings(settings);
        }
    }

    public componentDidMount() {
        window.addEventListener('beforeunload', this.handleUnload);
        this.applyDarkMode();
    }

    public componentWillUnmount() {
        window.removeEventListener('beforeunload', this.handleUnload);
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    public componentDidUpdate(prevProps: AppProps) {
        const { focused } = this.props;
        const visible = this.props.graphs.filter(g => g.visible);

        if (visible.length > this.props.maxActive) {
            this.props.hide_graphs(visible.slice(0, visible.length - this.props.maxActive).map(v => v.id));
        }

        const visibleIds = visible.map(g => g.id);
        if (focused !== undefined && !visibleIds.includes(focused)) {
            this.props.focus_graph(visibleIds.length > 0 ? visibleIds.reverse()[0] : undefined);
        }

        if (prevProps.darkMode !== this.props.darkMode) {
            this.applyDarkMode();
        }
    }

    applyDarkMode = () => {
        if (this.props.darkMode) {
            document.documentElement.classList.add('dark-mode');
        } else {
            document.documentElement.classList.remove('dark-mode');
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
        const graph = this.props.graphs.find(g => g.id === this.props.focused);

        if (graph) {
            // graph.traces = [...graph.traces, ...result];
            this.forceUpdate();
        }
    }

    focusGraph = (e: React.MouseEvent<HTMLDivElement>): void => {
        const graphId = e.currentTarget.dataset.graph as string;
        this.props.focus_graph(graphId);
    }

    changeFocus = (id: Graph['id']) => this.props.focus_graph(id);

    public render(): React.ReactNode {
        if (this.state.hasError) {
            return (
                <>
                    <Helmet>
                        <link rel='stylesheet' href={`${process.env.PUBLIC_URL}/${this.props.darkMode ? 'bootstrap-dark.min.css' : 'bootstrap-light.min.css'}`} />
                    </Helmet>
                    <h1 className='text-danger text-center mt-3'>{t('error.title')}</h1>
                    <p className='text-center my-3'>
                        <img src={`${process.env.PUBLIC_URL}/save_log.gif`} />
                    </p>
                    <p className='text-center'>{t('error.directions')}</p>
                </>
            );
        }

        // const graph = this.props.graphs.find(g => g.id === this.state.focused);
        const makeAction = (action: TraceAction) => () => this.props.focused && this.props.graph_action({ id: this.props.focused, action });

        const visibleGraphs = this.props.graphs.filter(g => g.visible).slice(0, this.props.maxActive);

        return (
            <>
                <Helmet>
                    <link rel='stylesheet' href={`${process.env.PUBLIC_URL}/${this.props.darkMode ? 'bootstrap-dark.min.css' : 'bootstrap-light.min.css'}`} />
                </Helmet>
                <Header
                    layoutUnlocked={!this.state.locked}
                    onToggleLock={this.toggleLock}
                    onChangeFocus={this.changeFocus}
                />
                <SideMenu
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
                                focused={g.id === this.props.focused}
                                layoutLocked={this.state.locked}
                            />
                        </div>
                    ))}
                </GraphContainer>
                <ModalPortal />
                <ToastContainer />
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
