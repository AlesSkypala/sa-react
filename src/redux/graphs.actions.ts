import { Md5 } from 'ts-md5';
import { dataWorker } from '..';
import { TraceSearchModal } from '../components/Modals';
import { DataService, DialogService } from '../services';
import { getLdevModeFromDataset, toLdevInternalFromVariant } from '../utils/ldev';
import { isHomogenous, splitTraceId } from '../utils/trace';
import { GraphsState } from './graphs';

const createCommonTrace = (graph: Graph, idPrefix: 'avg' | 'sum', titlePrefix: string): void => {
    const selected = graph.traces.filter(t => t.active);

    if (selected.length > 1) {
        graph.traces = [
            ...graph.traces,
            {
                id: idPrefix + '::' + Md5.hashStr(selected.map(s => s.id).join(','), false),
                handle: -1,
                title: `${titlePrefix} ${selected.length} křivek`,
                style: { width: 1, color: [ 255, 255, 255 ] },
                active: true,
            }
        ];
    }
};

type ActionLogic<T = unknown> = ((state: GraphsState, graph: Graph) => unknown) | {
    asynch(state: Readonly<GraphsState>, graph: Readonly<Graph>): Promise<T>;
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
    'tres': (state) => state.threshold = true,
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
            const ids = graph.traces.map(t => t.id);

            const zero = await dataWorker.is_zero(graph.xRange[0], graph.xRange[1], ids) as boolean[];

            return ids.filter((v, idx) => !zero[idx]);
        },
        post: (_, graph, data: Trace['id'][]) => {
            graph.traces = graph.traces.filter(t => data.includes(t.id));
        }
    },

    'avg': (_, graph) => createCommonTrace(graph, 'avg', 'Průměr'),
    'sum': (_, graph) => createCommonTrace(graph, 'sum', 'Průměr'),
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
            const activeTraces = graph.traces.filter(t => t.active);

            if (!isHomogenous(activeTraces)) { console.log('not a homogenous set of traces!'); return {}; }

            const [ source, dataset ] = splitTraceId(activeTraces[0]);
            const mode = getLdevModeFromDataset(dataset ?? '');

            if (!mode) { console.log('not a valid ldev set!'); return {}; }

            const map = await DataService.getHomogenousLdevMap(activeTraces, mode);

            const modemap: { [key in Exclude<LdevMapMode, 'hostgroup' | 'pool'>]: Set<string> } = {
                port: new Set(),
                ldev: new Set(),
                ecc: new Set(),
                mpu: new Set(),
                wwn: new Set(),
            };

            for (const ldev of map) {
                modemap.ldev.add(ldev.id);
                modemap.ecc.add(ldev.eccGroup);
                modemap.mpu .add(ldev.mpu);
                ldev.wwns.forEach(w => {
                    modemap.wwn.add(w.wwn);
                    modemap.port.add(w.port);
                });
            }

            console.log(modemap);

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
    'zoom-sync': (state, graph) => {
        const zoom = graph.zoom;
        for (const graph of state.items) {
            graph.zoom = zoom ? [...zoom] : undefined;
        }
    }
};

export default actions;