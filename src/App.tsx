import React from 'react';
import { GraphContainer, Header, SideMenu, ContainerLayout, GraphComponent } from './components';
import { ModalPortal, ImportModal, TraceSearchModal, TresholdModal, GraphEditModal } from './components/Modals';
import { AppEvents, DataService, DialogService } from './services';

import './App.css';
import { Md5 } from 'ts-md5';
import { GlobalHotKeys } from 'react-hotkeys';
import { plotWorker } from '.';
import { LayoutType } from './components/Header';
import debounce from 'lodash.debounce';

class App extends React.Component<Record<string, never>, AppState> {
    public state: AppState = {
        locked: true,
        focused: -1,

        layoutType: 'vertical',

        graphs: [],
        layout: [],
    };

    toggleLock = (): void => this.setState({ locked: !this.state.locked });
    addGraph = (): void => DialogService.open(ImportModal, this.onAddGraph, { isGraph: true });
    onTraceAddClick = (): void => DialogService.open(ImportModal, this.onAddTraces, { isGraph: false });

    onAddGraph = (result: Graph): void => {
        if (!result) { return; }

        const { graphs } = this.state;

        result.id = graphs.length > 0 ? Math.max(...graphs.map(g => g.id)) + 1 : 0;
        this.setState({
            graphs: [...graphs, result],
        });

        this.onLayoutChange(
            this.state.layoutType,
            [
                ...this.state.layout,
                {
                    i: String(result.id), x: 0, y: 0, w: 12, h: 6
                }
            ]
        );
    }

    onAddTraces = (result: Trace[]): void => {
        if (!result || !Array.isArray(result)) {
            return;
        }
        const graph = this.state.graphs.find(g => g.id === this.state.focused);

        if (graph) {
            graph.traces = [...graph.traces, ...result];
            this.forceUpdate();
        }
    }

    onRelayout = (layout: ContainerLayout): void => this.setState({ layout });
    focusGraph = (e: React.MouseEvent<HTMLDivElement>): void => {
        const graphId = e.currentTarget.dataset.graph as string;

        this.setState({ focused: Number.parseInt(graphId) });
    }
    onRemoveGraph = (id: number): void => DialogService.openConfirmation(
        {
            title: `Smazat graf ${this.state.graphs.find(g => g.id === id)?.title || 'unkown'}`,
            body: 'Opravdu chcete tento graf smazat?',
            okColor: 'danger',
        },
        res => {
            if (res) {
                this.setState({ graphs: [...this.state.graphs.filter(g => g.id !== id)] });
                this.onLayoutChange(this.state.layoutType, this.state.layout.filter(l => l.i !== String(id)));
            }
        }
    );
    onEditGraph = (id: number): void => DialogService.open(
        GraphEditModal,
        (edit) => {
            const graph = this.state.graphs.find(g => g.id === id);
            
            if (edit && graph) {
                Object.assign(graph, edit);
                this.forceUpdate();
            }
        },
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        { graph: this.state.graphs.find(g => g.id === id)! }
    );

    filterZero = async (): Promise<void> => {
        const graph = this.state.graphs.find(g => g.id === this.state.focused);
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
        const graph = this.state.graphs.find(g => g.id === this.state.focused);
        if (!graph) return;

        // const filtered = graph.traces.filter(t => this.state.selectedTraces.indexOf(t.id) >= 0).map(t => ({ ...t, filtering: 'sg' } as Trace));
        // graph.traces = [...graph.traces.filter(t => this.state.selectedTraces.indexOf(t.id) < 0), ...filtered];
        // this.setState({ selectedTraces: [] });
    }

    selectAboveTreshold = async (treshold: number): Promise<void> => {
        const graph = this.state.graphs.find(g => g.id === this.state.focused);
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
        const graph = this.state.graphs.find(g => g.id === this.state.focused);
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
                DialogService.open(TraceSearchModal, traces => {
                    if (traces) { graph.activeTraces = traces; }
                    this.forceUpdate();
                }, { traces: graph.traces });
                break;
            case 'tres':
                DialogService.open(TresholdModal, val => this.selectAboveTreshold(val), {});
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
        const graph = this.state.graphs.find(g => g.id === this.state.focused);

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
        const graph = this.state.graphs.find(g => g.id === this.state.focused);

        if (graph) {
            graph[key] = value as never;
            this.forceUpdate();
        }
    };
    selectUnique = (): void => {
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
        graph.activeTraces = newSel;
    }
    onZoomUpdated = (id: number, zoom: [[Date, Date], [unknown, unknown]]): void => {
        const graph = this.state.graphs.find(g => g.id === id);
        if (!graph) return;

        graph.zoom = zoom;
        this.forceUpdate();
    }
    zoomSync = (zoom: Graph['zoom']): void => {
        for (const graph of this.state.graphs) {
            graph.zoom = zoom ? [...zoom] : [undefined, undefined];
        }

        this.forceUpdate();
    };
    
    emitRelayoutEvent = debounce((type: LayoutType, layout: ContainerLayout) => AppEvents.onRelayout.emit({ type, layout }), 300);
    onLayoutChange = (type: LayoutType, layout?: ContainerLayout) => {
        
        if (!layout) layout = this.state.layout;

        this.setState({ layoutType: type });

        if (layout.length <= 0) return;
        if (layout.length == 1) {
            const nLayout = [
                { ...layout[0], x: 0, y: 0, w: 12, h: 12 }
            ];
            this.setState({ layout: nLayout });
            this.emitRelayoutEvent(type, nLayout);
            return;
        }

        switch (type) {
            case 'horizontal':
            case 'vertical':
                {
                    const mSize = Math.max(1, Math.floor(12 / layout.length));
                    const remSize = Math.max(1, 12 - mSize * (layout.length - 1));
                    
                    const nLayout: ContainerLayout = [
                        {
                            ...layout[0],
                            ...(type === 'horizontal' ? { h: 12, w: remSize } : { w: 12, h: remSize }),
                            x: 0,
                            y: 0,
                        }
                    ];

                    for (let i = 1; i < layout.length; ++i) {
                        nLayout.push({
                            ...layout[i],
                            ...(type === 'horizontal' ? {
                                h: 12,
                                w: mSize,
                                y: 0,
                                x: remSize + (i - 1) * mSize
                            } : {
                                w: 12,
                                h: mSize,
                                x: 0,
                                y: remSize + (i - 1) * mSize
                            })
                        });
                    }


                    console.log(nLayout);
                    this.setState({ layout: nLayout });
                    this.emitRelayoutEvent(type, nLayout);
                }
                break;
        }
    };

    public render(): React.ReactNode {
        return (
            <>
                <Header
                    layoutUnlocked={!this.state.locked}
                    onToggleLock={this.toggleLock}
                    onAddGraph={this.addGraph}
                    onLayout={this.onLayoutChange}
                />
                <SideMenu
                    selectedGraph={this.state.graphs.find(g => g.id === this.state.focused)}
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
                            key={g.id}
                            data-graph={g.id}
                            onClick={this.focusGraph}
                        >
                            <GraphComponent
                                {...g}
                                focused={g.id === this.state.focused}
                                layoutLocked={this.state.locked}
                                onEdit={this.onEditGraph}
                                onRemove={this.onRemoveGraph}
                                onZoomUpdated={this.onZoomUpdated}
                            />
                        </div>
                    ))}
                </GraphContainer>
                <ModalPortal />
                <GlobalHotKeys keyMap={{ SEL_ALL: 'ctrl+a', SEL_INV: 'ctrl+i', DEL_TRACE: 'del' }} handlers={{ DEL_TRACE: () => this.onTraceAction('del-sel'), SEL_ALL: () => this.onTraceAction('sel-all'), SEL_INV: () => this.onTraceAction('inv') }} />
            </>
        );
    }
}

export interface AppState {
    locked: boolean;
    focused: Graph['id'];

    graphs: Graph[];
    layout: ContainerLayout;
    layoutType: LayoutType;
}

export default App;