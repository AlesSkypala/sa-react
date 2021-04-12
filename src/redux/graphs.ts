import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import debounce from 'lodash.debounce';
import { Layout } from 'react-grid-layout';
import { AppEvents } from '../services';
import { SliceStateDraft } from './helpers';
import actions from './graphs.actions';
import { dataWorker } from '..';
import deepClone from 'lodash/cloneDeep';

const emitRelayoutEvent = debounce((type: StackingType, layout: Layout[]) => AppEvents.onRelayout.emit({ type, layout }), 300);

const relayout = ({ layout, items, stacking }: SliceStateDraft<typeof graphsSlice>): Layout[] => {
    if (stacking === 'freeform') {
        const gIds = items.map(g => g.id.toString());
        const lIds = layout.map(s => s.i);

        const missing = items.filter(g => !lIds.includes(g.id.toString()));

        return [
            ...layout.filter(s => gIds.includes(s.i)),
            ...missing.map(g => ({
                i: g.id.toString(),
                x: 0, y: 0,
                w: 4, h: 4,
            }))
        ];
    }

    if (items.length <= 0) return [];

    const horizontal = stacking === 'horizontal';

    const mSize = Math.max(1, Math.floor(12 / items.length));
    const remSize = Math.max(1, 12 - mSize * (items.length - 1));

    const [ fSize, size, position ] = horizontal ? [
        // Horizontal
        { w: remSize, h: 12 }, { w: mSize, h: 12 },
        (i: number) => ({ x: Math.min(i, 1) * remSize + Math.max(i - 1, 0) * mSize, y: 0 }),
    ] : [
        // Vertical
        { w: 12, h: remSize }, { w: 12, h: mSize },
        (i: number) => ({ x: 0, y: Math.min(i, 1) * remSize + Math.max(i - 1, 0) * mSize }),
    ];
    
    return items.map((g, i) => ({
        ...(i <= 0 ? fSize : size),
        ...position(i),
        i: g.id.toString()
    }));
};

export const graph_action = createAsyncThunk(
    'graphs/graph_action',
    async (payload: { id: Graph['id'], action: TraceAction }, { getState }) => {
        const state = (getState() as RootStore).graphs;
        const graph = state.items.find(g => g.id === payload.id);
        const actionObj = actions[payload.action];

        if (!graph || typeof actionObj !== 'object') return { ...payload, data: undefined };

        return { ...payload, data: await actionObj.asynch(state, graph) };
    }
);

export const graph_threshold_select = createAsyncThunk(
    'graphs/graph_threshold_select',
    async (payload: { id: Graph['id'], threshold: number }, { getState, dispatch }) => {
        const state = (getState() as RootStore).graphs;
        const graph = state.items.find(g => g.id === payload.id);

        if (!graph) return { id: payload, valid: undefined };

        const fits_thresh = await dataWorker.threshold(graph.xRange[0], graph.xRange[1], payload.threshold, ...graph.traces.map(t => t.id)) as boolean[];

        dispatch(graphsSlice.actions.edit_graph({
            id: payload.id,
            activeTraces: new Set(graph.traces.filter((t, idx) => fits_thresh[idx]).map(t => t.id))
        }));

        dispatch(graphsSlice.actions.toggle_threshold(false));
    }
);

type GraphEdit = Partial<Pick<Graph, 'title' | 'xLabel' | 'yLabel'| 'zoom' | 'activeTraces'>>;

export const graphsSlice = createSlice({
    name: 'graphs',
    initialState: {
        items: [] as Readonly<Graph>[],
        layout: [] as Readonly<Layout>[],
        stacking: 'vertical' as StackingType,
        threshold: false,
    },
    reducers: {
        add_graphs: (state, action: PayloadAction<Graph | Graph[]>) => {
            const graphs = Array.isArray(action.payload) ? action.payload : [ action.payload ];

            let maxId = state.items.reduce((prev, next) => Math.max(prev, next.id), -1);

            graphs.forEach(g => g.id = ++maxId);
            state.items.push(...graphs);
            
            state.layout = relayout(state);
            emitRelayoutEvent(state.stacking, state.layout);
        },

        remove_graphs: (state, action: PayloadAction<Graph['id'] | Graph['id'][]>) => {
            const ids = Array.isArray(action.payload) ? action.payload : [ action.payload ];
            
            state.items = state.items.filter(g => !ids.includes(g.id));

            state.layout = relayout(state);
            emitRelayoutEvent(state.stacking, state.layout);
        },

        edit_graph: (state, action: PayloadAction<{ id: Graph['id'] } & GraphEdit>) => {
            const graph = state.items.find(g => g.id === action.payload.id);

            if (graph) {
                const data: Partial<Graph> = { ...action.payload };
                delete data.id;

                Object.assign(graph, data);
            }
        },

        toggle_threshold: (state, action: PayloadAction<boolean>) => {
            state.threshold = action.payload;
        },

        clone_graph: (state, action: PayloadAction<{ id: Graph['id'], activeOnly?: boolean}>) => {
            const graph = state.items.find(g => g.id === action.payload.id);
            const maxId = state.items.reduce((prev, next) => Math.max(prev, next.id), -1);
            
            if (graph) {
                const clone = deepClone(graph);
                clone.id = maxId + 1;

                state.items.push(clone);
            }
        },

        set_layout: (state, action: PayloadAction<Layout[]>) => {
            state.layout = action.payload;
        },

        set_stacking: (state, action: PayloadAction<StackingType>) => {
            state.stacking = action.payload;
            state.layout = relayout(state);
            emitRelayoutEvent(state.stacking, state.layout);
        },
    },
    
    extraReducers: builder => {
        builder.addCase(graph_action.fulfilled, (state, action) => {
            const payload = action.payload;
            const graph = state.items.find(g => g.id === payload.id);
            const actionObj = actions[payload.action];
    
            if (!graph) return;

            if (typeof actionObj === 'object') {
                actionObj.post(state, graph, payload.data);
            } else {
                actionObj(state, graph);
            }
        });
    }
});

export type GraphsState = SliceStateDraft<typeof graphsSlice>;
export const {
    add_graphs, remove_graphs,
    clone_graph, edit_graph,
    set_layout, set_stacking,
} = graphsSlice.actions;

export default graphsSlice.reducer;