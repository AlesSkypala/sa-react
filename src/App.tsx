import React from 'react';
import { GraphContainer, Header, SideMenu, GraphComponent } from './components';
import { ModalPortal, AddGraphModal, TraceSearchModal, GraphEditModal, ConfirmModal } from './components/Modals';
import { DataService } from './services';

import './App.css';
import { Md5 } from 'ts-md5';
import { GlobalHotKeys } from 'react-hotkeys';
import { plotWorker } from '.';
import { connect } from 'react-redux';
import { open_modal, add_graphs, remove_graphs, ReduxProps } from './redux';

class App extends React.Component<AppProps, AppState> {
    public state: AppState = {
        locked: true,
        focused: -1,
        threshold: false,
    };

    toggleLock = (): void => this.setState({ locked: !this.state.locked });
    addGraph = () => this.props.open_modal({ type: AddGraphModal, resolve: res => res && this.props.add_graphs(res), args: {} });
    onTraceAddClick = (): void => {
        // DialogService.open(ImportModal, this.onAddTraces, { isGraph: false });
    }

    onAddTraces = (result: Trace[]): void => {
        if (!result || !Array.isArray(result)) {
            return;
        }
        const graph = this.props.graphs.find(g => g.id === this.state.focused);

        if (graph) {
            graph.traces = [...graph.traces, ...result];
            this.forceUpdate();
        }
    }

    // onRelayout = (layout: ContainerLayout): void => this.setState({ layout });
    focusGraph = (e: React.MouseEvent<HTMLDivElement>): void => {
        const graphId = e.currentTarget.dataset.graph as string;

        this.setState({ focused: Number.parseInt(graphId) });
    }
    onRemoveGraph = (id: number) => this.props.open_modal({
        type: ConfirmModal,
        args: {
            title: `Smazat graf ${this.props.graphs.find(g => g.id === id)?.title || 'unkown'}`,
            body: 'Opravdu chcete tento graf smazat?',
            okColor: 'danger',
        },
        resolve: (res) => {
            if (res) {
                // this.setState({ graphs: [...this.props.graphs.filter(g => g.id !== id)] });
                // this.onLayoutChange(this.state.layoutType, this.state.layout.filter(l => l.i !== String(id)));
            }
        }
    });
    onEditGraph = (id: number) => this.props.open_modal({
        type: GraphEditModal,
        resolve: (edit) => {
            const graph = this.props.graphs.find(g => g.id === id);
            
            if (edit && graph) {
                Object.assign(graph, edit);
                this.forceUpdate();
            }
        },
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        args: { graph: this.props.graphs.find(g => g.id === id)! }
    });

    filterZero = async (): Promise<void> => {
        const graph = this.props.graphs.find(g => g.id === this.state.focused);
        if (!graph) return;

        const remaining: Trace[] = [];
        const is_zero = await plotWorker.is_zero_by_id(graph.traces.map(t => t.id)) as boolean[];

        for (let i = 0; i < is_zero.length; ++i) {
            if (!is_zero[i]) {
                remaining.push(graph.traces[i]);
            }
        }

        graph.traces = remaining;
        this.forceUpdate();
    }

    filterCurves = async (): Promise<void> => {
        const graph = this.props.graphs.find(g => g.id === this.state.focused);
        if (!graph) return;

        // const filtered = graph.traces.filter(t => this.state.selectedTraces.indexOf(t.id) >= 0).map(t => ({ ...t, filtering: 'sg' } as Trace));
        // graph.traces = [...graph.traces.filter(t => this.state.selectedTraces.indexOf(t.id) < 0), ...filtered];
        // this.setState({ selectedTraces: [] });
    }

    selectAboveTreshold = async (treshold: number): Promise<void> => {
        const graph = this.props.graphs.find(g => g.id === this.state.focused);
        if (!graph) return;

        const select: Trace['id'][] = [];
        const is_zero = await plotWorker.treshold_by_id(graph.traces.map(t => t.id), treshold) as boolean[];

        for (let i = 0; i < is_zero.length; ++i) {
            if (is_zero[i]) {
                select.push(graph.traces[i].id);
            }
        }

        graph.activeTraces = select;
        this.forceUpdate();
    }

    createCommonTrace = (idPrefix: 'avg' | 'sum', titlePrefix: string): void => {
        const graph = this.props.graphs.find(g => g.id === this.state.focused);
        if (!graph) return;

        const selected = graph.traces.filter(t => graph.activeTraces.indexOf(t.id) >= 0);

        if (selected.length > 1) {
            graph.traces = [
                ...graph.traces,
                {
                    id: idPrefix + '::' + Md5.hashStr(selected.map(s => s.id).join(','), false),
                    title: `${titlePrefix} ${selected.length} křivek`,
                    pipeline: {
                        type: idPrefix,
                        children: selected.map(s => JSON.parse(JSON.stringify(s.pipeline))),
                        options: undefined,
                    }
                }
            ];

            this.forceUpdate();
        }
    }

    onTraceAction = (action: TraceAction): void => {
        const graph = this.props.graphs.find(g => g.id === this.state.focused);

        if (!graph) return;

        switch (action) {
            case 'filter':
                this.filterCurves();
                break;
            case 'sel-unq':
                this.selectUnique();
                break;
            case 'search':
                this.props.open_modal({
                    type: TraceSearchModal,
                    args: { traces: graph.traces },
                    resolve: (traces: string[] | undefined) => {
                        // if (traces) { graph.activeTraces = traces; }
                        this.forceUpdate();
                    }
                });
                break;
            case 'tres':
                this.setState({ threshold: true });
                // DialogService.open(TresholdModal, val => this.selectAboveTreshold(val), {});
                break;

            case 'sel-all':
                graph.activeTraces = graph.traces.map(t => t.id);
                this.forceUpdate();
                break;
            case 'inv':
                graph.activeTraces = graph.traces.map(t => t.id).filter(t => graph.activeTraces.indexOf(t) < 0);
                this.forceUpdate();
                break;
            case 'des':
                graph.activeTraces = [];
                this.forceUpdate();
                break;
            case 'del-zero':
                this.filterZero();
                break;

            case 'avg':
                this.createCommonTrace('avg', 'Průměr');
                break;
            case 'sum':
                this.createCommonTrace('sum', 'Suma');
                break;
            case 'del-sel':
                if (graph.activeTraces.length > 0) {
                    graph.traces = graph.traces.filter(t => graph.activeTraces.indexOf(t.id) < 0);
                    this.forceUpdate();
                }
                break;
            case 'del-unsel':
                if (graph.activeTraces.length > 0) {
                    graph.traces = graph.traces.filter(t => graph.activeTraces.indexOf(t.id) >= 0);
                    this.forceUpdate();
                }
                break;
            case 'sort':
                graph.traces = [...graph.traces.sort((a, b) => a > b ? 1 : (a === b ? 0 : -1))];
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
    onTraceSelect = (id: string): void => {
        const graph = this.props.graphs.find(g => g.id === this.state.focused);

        if (!graph) {
            return;
        }

        const idx = graph.activeTraces.indexOf(id);

        if (idx < 0) {
            graph.activeTraces = [ ...graph.activeTraces, id ];
        } else {
            graph.activeTraces = [ ...graph.activeTraces.slice(0, idx), ...graph.activeTraces.slice(idx + 1) ];
        }
        this.forceUpdate();
    };
    onGraphPropChange = (key: keyof Graph, value: Graph[keyof Graph]): void => {
        const graph = this.props.graphs.find(g => g.id === this.state.focused);

        if (graph) {
            graph[key] = value as never;
            this.forceUpdate();
        }
    };
    selectUnique = (): void => {
        const graph = this.props.graphs.find(g => g.id === this.state.focused);
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
        graph.activeTraces = newSel;
    }
    onZoomUpdated = (id: number, zoom: Graph['zoom']): void => {
        const graph = this.props.graphs.find(g => g.id === id);
        if (!graph) return;

        graph.zoom = zoom;
        this.forceUpdate();
    }
    zoomSync = (zoom: Graph['zoom']): void => {
        for (const graph of this.props.graphs) {
            graph.zoom = zoom ? [...zoom] : undefined;
        }

        this.forceUpdate();
    };
    onThresholdSelected = (val: unknown) => {
        if (!this.state.threshold) return;
        this.selectAboveTreshold(val as number);
        this.setState({ threshold: false });
    }
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
                    onGraphPropChange={this.onGraphPropChange}
                    onTraceAction={this.onTraceAction}
                    onTraceSelect={this.onTraceSelect}
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
                                {...g}
                                focused={g.id === this.state.focused}
                                layoutLocked={this.state.locked}
                                threshold={this.state.threshold}
                                onEdit={this.onEditGraph}
                                onRemove={this.onRemoveGraph}
                                onZoomUpdated={this.onZoomUpdated}
                                onThreshold={this.onThresholdSelected}
                                onClone={this.onClone}
                            />
                        </div>
                    ))}
                </GraphContainer>
                <ModalPortal />
                <div id="context-menu"></div>
                <GlobalHotKeys keyMap={{ SEL_ALL: 'ctrl+a', SEL_INV: 'ctrl+i', DEL_TRACE: 'del' }} handlers={{ DEL_TRACE: () => this.onTraceAction('del-sel'), SEL_ALL: () => this.onTraceAction('sel-all'), SEL_INV: () => this.onTraceAction('inv') }} />
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
    open_modal,
};

export type AppProps = ReduxProps<typeof stateProps, typeof dispatchProps>;

export default connect(stateProps, dispatchProps)(App);