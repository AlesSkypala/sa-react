import { Md5 } from 'ts-md5';
import { dataWorker } from '..';
import { TraceSearchModal } from '../components/Modals';
import { DataService, DialogService } from '../services';
import DataJob from '../services/DataJob';
import { getLdevModeFromDataset, toLdevInternalFromVariant } from '../utils/ldev';
import { isHomogenous, splitTraceId } from '../utils/trace';
import { GraphsState } from './graphs';
import Logger from '../Logger';
import { Dispatch } from 'react';
import { invoke_job } from './jobs';
import { t } from '../locale';

type ActionLogic<T = unknown> = ((state: GraphsState, graph: Graph) => unknown) | {
    asynch(state: Readonly<GraphsState>, graph: Readonly<Graph>, dispatch: Dispatch<unknown>): Promise<T>;
    post(state: GraphsState, graph: Graph, data: T): unknown;
};

const actions: { [k in TraceAction]: ActionLogic<unknown> } = {

    'filter': (_, graph) => {
        for (const trace of graph.traces) {
            trace.filtering = 'sg';
        }
    },
    'sel-unq': (_, graph) => {
        const uniq: Set<Trace['handle']> = new Set();

        graph.traces.forEach(t => {
            if (!uniq.has(t.handle)) {
                uniq.add(t.handle);
                t.active = true;
            } else {
                t.active = false;
            }
        });
    },
    'search': (_, graph) =>
        DialogService.open(
            TraceSearchModal,
            traces => {
                if (traces) { graph.traces.forEach(t => t.active = traces.includes(t.id)); }
            },
            { traces: graph.traces }
        ),
    'tres': (state) => state.threshold = !state.threshold,
    'sel-all': (_, graph) => {
        graph.traces.forEach(t => t.active = true);
    },
    'inv': (_, graph) => {
        graph.traces.forEach(t => t.active = !t.active);
    },
    'des': (_, graph) => {
        graph.traces.filter(t => t.active).forEach(t => t.active = false);
    },
    'del-zero': {
        asynch: async (_, graph) => {
            const handles = graph.traces.map(t => t.handle);

            const zero = await dataWorker.is_zero(graph.xRange[0], graph.xRange[1], handles) as boolean[];

            return new Set(graph.traces.filter((v, idx) => !zero[idx]).map(t => t.id));
        },
        post: (_, graph, data: Set<Trace['id']>) => {
            graph.traces = graph.traces.filter(t => data.has(t.id));
        }
    },

    'avg': {
        asynch: async (_, graph, dispatch) => {
            const job = new DataJob(graph.xRange);
            const handles = graph.traces.filter(t => t.active).map(t => t.handle);

            job.createOperation({
                id: `local::avg::${Md5.hashStr(String(Math.random()))}`,
                handles,
                operation: 'avg',
                xType: graph.xType,
                title: t('datasets.avg', { count: handles.length }),
            }).relate(graph.id);

            dispatch(invoke_job(job));
        },
        post: () => { /* Nothing to do */ }
    },
    'sum': {
        asynch: async (_, graph, dispatch) => {
            const job = new DataJob(graph.xRange);
            const handles = graph.traces.filter(t => t.active).map(t => t.handle);

            job.createOperation({
                id: `local::sum::${Md5.hashStr(String(Math.random()))}`,
                handles,
                operation: 'sum',
                xType: graph.xType,
                title: t('datasets.sum', { count: handles.length }),
            }).relate(graph.id);

            dispatch(invoke_job(job));
        },
        post: () => { /* Nothing to do */ }
    },
    'del-sel': (_, graph) => {
        graph.traces = graph.traces.filter(t => !t.active);
    },
    'del-unsel': (_, graph) => {
        graph.traces = graph.traces.filter(t => t.active);
    },
    'sort': (_, graph) => {
        graph.traces = [...graph.traces.sort((a, b) => a > b ? 1 : (a === b ? 0 : -1))];
    },

    'name-sync': () => { /* TODO: */ },
    'bind-sync': {
        asynch: async (state, graph) => {
            if (state.items.length <= 1) return {};

            const activeTraces = graph.traces.filter(t => t.active);

            if (!isHomogenous(activeTraces)) { Logger.info('The graph does not contain a homogenous trace set.'); return {}; }

            const [ source, dataset ] = splitTraceId(activeTraces[0]);
            const mode = getLdevModeFromDataset(dataset ?? '');

            if (!mode) { Logger.info('The graph contains a homogenous set, but the set is not related to the LDEV map.'); return {}; }

            const map = await DataService.getHomogenousLdevMap(activeTraces, mode);

            const modemap: { [key in Exclude<LdevMapMode, | 'pool'>]: Set<string> } = {
                port: new Set(),
                ldev: new Set(),
                ecc: new Set(),
                mpu: new Set(),
                wwn: new Set(),
                hostgroup: new Set(),
            };

            for (const ldev of map) {
                modemap.ldev.add(ldev.id);
                modemap.mpu .add(ldev.mpu);
                ldev.pool && ldev.pool.eccGroups.forEach(e => modemap.ecc.add(e));
                ldev.wwns.forEach(w => {
                    modemap.wwn.add(w.wwn);
                    modemap.port.add(w.port);
                });
                ldev.hostPorts.forEach(p => modemap.hostgroup.add(p.hostgroup));
            }

            const result: { [graph: string]: Set<string> } = {};

            for (const g of state.items) {
                if (g.id === graph.id) continue;

                result[g.id] = new Set();

                for (const trace of g.traces) {
                    const [ tSource, tDataset, tVariant ] = splitTraceId(trace);

                    if (source !== tSource || !tDataset || !tVariant) continue;

                    const tMode = getLdevModeFromDataset(tDataset);

                    if (!tMode) continue;

                    if (modemap[tMode].has(toLdevInternalFromVariant(tVariant, tMode))) {
                        result[g.id].add(trace.id);
                    }
                }

                if (result[g.id].size <= 0) {
                    delete result[g.id];
                }
            }

            return result;
        },
        post: (state, graph, data: { [key: string]: Set<string> }) => {
            for (const id in data) {
                const graph = state.items.find(g => g.id === id);
                const set = data[id];

                if (graph) {
                    graph.traces.forEach(t => {
                        t.active = set.has(t.id);
                    });
                }
            }
        }
    },
    'zoom-sync': {
        asynch: async (state, graph) => {
            const zoom = graph.zoom;

            if (!zoom) return {};

            const ret: { [key: string]: Graph['zoom'] } = {};

            for (const g of state.items) {
                if (g.id === graph.id || zoom[0] < g.xRange[0] || zoom[1] > g.xRange[1]) continue;

                ret[g.id] = await dataWorker.recommend_extents(zoom[0], zoom[1], g.traces.filter(t => t.active).map(t => t.handle));
            }

            return ret;
        },
        post: (state, _graph, data: { [key: string]: Graph['zoom'] }) => {
            state.items.forEach(g => {
                if (g.id in data) {
                    g.zoom = data[g.id];
                }
            });
        }
    }
};

export default actions;
