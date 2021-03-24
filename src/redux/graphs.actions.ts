import { Md5 } from 'ts-md5';
import { plotWorker } from '..';
import { TraceSearchModal } from '../components/Modals';
import { DataService, DialogService } from '../services';
import { GraphsState } from './graphs';

const createCommonTrace = (graph: Graph, idPrefix: 'avg' | 'sum', titlePrefix: string): void => {
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
    }
};

type ActionLogic<T = unknown> = ((state: GraphsState, graph: Graph) => unknown) | {
    // eslint-disable-next-line @typescript-eslint/ban-types
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
    },
    'search': (_, graph) =>
        DialogService.open(
            TraceSearchModal,
            traces => {
                if (traces) { graph.activeTraces = traces; }
            },
            { traces: graph.traces }
        ),
    'tres': (state) => state.threshold = true,
    'sel-all': (_, graph) => {
        graph.activeTraces = graph.traces.map(t => t.id);
    },
    'inv': (_, graph) => {
        graph.activeTraces = graph.traces.map(t => t.id).filter(t => graph.activeTraces.indexOf(t) < 0);
    },
    'des': (_, graph) => {
        graph.activeTraces = [];
    },
    'del-zero': {
        asynch: async (_, graph) => {
            const ids = graph.traces.map(t => t.id);
            const zero = await plotWorker.is_zero_by_id(ids) as boolean[];

            return new Set(ids.filter((v, idx) => !zero[idx]));
        },
        post: (_, graph, data: Set<Trace['id']>) => {
            graph.traces = graph.traces.filter(t => data.has(t.id));
        }
    },

    'avg': (_, graph) => createCommonTrace(graph, 'avg', 'Průměr'),
    'sum': (_, graph) => createCommonTrace(graph, 'sum', 'Průměr'),
    'del-sel': (_, graph) => {
        if (graph.activeTraces.length <= 0) return;
        graph.traces = graph.traces.filter(t => graph.activeTraces.indexOf(t.id) < 0);
    },
    'del-unsel': (_, graph) => {
        if (graph.activeTraces.length <= 0) return;
        graph.traces = graph.traces.filter(t => graph.activeTraces.indexOf(t.id) >= 0);
    },
    'sort': (_, graph) => {
        graph.traces = [...graph.traces.sort((a, b) => a > b ? 1 : (a === b ? 0 : -1))];
    },

    'name-sync': () => { /* TODO: */ },
    'bind-sync': () => { /* TODO: */ },
    'zoom-sync': (state, graph) => {
        const zoom = graph.zoom;
        for (const graph of state.items) {
            graph.zoom = zoom ? [...zoom] : undefined;
        }
    }
};

export default actions;