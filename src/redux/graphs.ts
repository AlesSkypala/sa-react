import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import debounce from 'lodash.debounce';
import { Layout } from 'react-grid-layout';
import { AppEvents } from '../services';
import { SliceStateDraft } from './helpers';
import actions from './graphs.actions';
import { dataWorker } from '..';
import deepClone from 'lodash/cloneDeep';
import * as uid from 'uuid';

const emitRelayoutEvent = debounce((type: StackingType, layout: Layout[]) => AppEvents.onRelayout.emit({ type, layout }), 300);

const relayout = ({ layout, items, stacking }: SliceStateDraft<typeof graphsSlice>): Layout[] => {
    const visibleItems = items.filter(g => g.visible);

    if (stacking === 'freeform') {
        const gIds = visibleItems.map(g => g.id.toString());
        const lIds = layout.map(s => s.i);

        const missing = visibleItems.filter(g => !lIds.includes(g.id.toString()));

        return [
            ...layout.filter(s => gIds.includes(s.i)),
            ...missing.map(g => ({
                i: g.id.toString(),
                x: 0, y: 0,
                w: 4, h: 4,
            }))
        ];
    }

    if (visibleItems.length <= 0) return [];

    if (stacking === 'grid') {
        const cols = Math.floor(Math.sqrt(visibleItems.length));
        const rows = Math.ceil(visibleItems.length / cols);

        const ret: Layout[] = [];

        for (let row = 0; row < rows; ++row) {
            const rowItems = visibleItems.slice(cols * row, Math.min(cols * (row + 1), visibleItems.length));

            rowItems.forEach((i, idx) => {
                ret.push({
                    i: i.id,
                    w: 12 / rowItems.length,
                    h: 12 / rows,
                    x: (12 / rowItems.length) * idx,
                    y: (12 / cols) * row,
                });
            });
        }

        return ret;
    }

    const horizontal = stacking === 'horizontal';

    const mSize = Math.max(1, Math.floor(12 / visibleItems.length));
    const remSize = Math.max(1, 12 - mSize * (visibleItems.length - 1));

    const [ fSize, size, position ] = horizontal ? [
        // Horizontal
        { w: remSize, h: 12 }, { w: mSize, h: 12 },
        (i: number) => ({ x: Math.min(i, 1) * remSize + Math.max(i - 1, 0) * mSize, y: 0 }),
    ] : [
        // Vertical
        { w: 12, h: remSize }, { w: 12, h: mSize },
        (i: number) => ({ x: 0, y: Math.min(i, 1) * remSize + Math.max(i - 1, 0) * mSize }),
    ];

    return visibleItems.map((g, i) => ({
        ...(i <= 0 ? fSize : size),
        ...position(i),
        i: g.id.toString()
    }));
};

export const graph_action = createAsyncThunk(
    'graphs/graph_action',
    async (payload: { id: Graph['id'], action: TraceAction }, { getState, dispatch }) => {
        const state = (getState() as RootStore).graphs;
        const graph = state.items.find(g => g.id === payload.id);
        const actionObj = actions[payload.action];

        if (!graph || typeof actionObj !== 'object') return { ...payload, data: undefined };

        return { ...payload, data: await actionObj.asynch(state, graph, dispatch) };
    }
);

export const graph_threshold_select = createAsyncThunk(
    'graphs/graph_threshold_select',
    async (payload: { id: Graph['id'], threshold: number }, { getState, dispatch }) => {
        const state = (getState() as RootStore).graphs;
        const graph = state.items.find(g => g.id === payload.id);

        if (!graph) return { id: payload, valid: undefined };

        const [ start, end ] = graph.zoom ? graph.zoom.slice(0, 2) : graph.xRange;

        const fits_thresh = await dataWorker.threshold(start, end, payload.threshold, graph.traces.map(t => t.handle)) as boolean[];

        dispatch(graphsSlice.actions.toggle_traces({
            id: payload.id,
            traces: new Set(graph.traces.filter((t, idx) => fits_thresh[idx]).map(t => t.id)),
            val: true,
            negateRest: true,
        }));

        dispatch(graphsSlice.actions.toggle_threshold(false));
    }
);

type GraphEdit = Partial<Pick<Graph, 'title' | 'xLabel' | 'yLabel'| 'zoom' | 'timeZone'>>;
type TraceEdit = Partial<Pick<Trace, 'title'>> & { style?: Partial<TraceStyle> };

export const graphsSlice = createSlice({
    name: 'graphs',
    initialState: {
        items: [] as Readonly<Graph>[],
        layout: [] as Readonly<Layout>[],
        stacking: 'grid' as StackingType,
        focused: undefined as Graph['id'] | undefined,
        threshold: false,
    },
    reducers: {
        add_graphs: (state, action: PayloadAction<Graph | Graph[]>) => {
            const graphs = Array.isArray(action.payload) ? action.payload : [ action.payload ];
            state.items.push(...graphs);

            state.layout = relayout(state);
            emitRelayoutEvent(state.stacking, state.layout);
        },

        focus_graph: (state, action: PayloadAction<Graph['id'] | undefined>) => {
            state.focused = action.payload;
        },

        sync_timezone: (state, action: PayloadAction<Graph['timeZone']>) => {
            state.items.forEach(g => {
                if (g.xType === 'datetime') {
                    g.timeZone = action.payload;
                }
            });
        },

        remove_graphs: (state, action: PayloadAction<Graph['id'] | Graph['id'][]>) => {
            const ids = Array.isArray(action.payload) ? action.payload : [ action.payload ];

            state.items = state.items.filter(g => !ids.includes(g.id));
            ids.forEach( id => { if (state.focused === id) state.focused = undefined; } );

            state.layout = relayout(state);
            emitRelayoutEvent(state.stacking, state.layout);
        },

        hide_graphs: (state, action: PayloadAction<Graph['id'] | Graph['id'][]>) => {
            const ids = Array.isArray(action.payload) ? action.payload : [ action.payload ];

            state.items.forEach(g => { if (ids.includes(g.id)) g.visible = false; });
            ids.forEach( id => { if (state.focused === id) state.focused = undefined; } );

            state.layout = relayout(state);
            emitRelayoutEvent(state.stacking, state.layout);
        },

        unhide_graphs: (state, action: PayloadAction<Graph['id'] | Graph['id'][]>) => {
            const ids = Array.isArray(action.payload) ? action.payload : [ action.payload ];

            state.items.forEach(g => { if (ids.includes(g.id)) g.visible = true; });

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

        add_traces: (state, action: PayloadAction<{ id: Graph['id'], traces: Trace[] }>) => {
            const graph = state.items.find(g => g.id === action.payload.id);

            if (graph) {
                graph.traces.push(...action.payload.traces);
            }
        },

        edit_traces: (state, action: PayloadAction<{ id: Graph['id'], traces: Set<Trace['id']>, edit: TraceEdit }>) => {
            const { id, traces, edit } = action.payload;
            const graph = state.items.find(g => g.id === id);

            if (graph) {
                graph.traces.forEach(t => {
                    if (!traces.has(t.id)) return;

                    ++t.rev;

                    if (edit.title) { t.title = edit.title; }
                    if (edit.style) { t.style = { ...t.style, ...edit.style }; }
                });
            }
        },

        remove_traces: (state, action: PayloadAction<{ id: Graph['id'], traces: Set<Trace['id']> }>) => {
            const graph = state.items.find(g => g.id === action.payload.id);

            if (graph) {
                graph.traces = graph.traces.filter(t => !action.payload.traces.has(t.id));
            }
        },

        toggle_traces: (state, action: PayloadAction<{ id: Graph['id'], traces: Set<Trace['id']>, val: boolean, negateRest?: boolean }>) => {
            const graph = state.items.find(g => g.id === action.payload.id);

            if (graph) {
                graph.traces.forEach(t => {
                    if (action.payload.traces.has(t.id)) {
                        t.active = action.payload.val;
                    } else if (action.payload.negateRest) {
                        t.active = !action.payload.val;
                    }
                });
            }
        },

        toggle_threshold: (state, action: PayloadAction<boolean>) => {
            state.threshold = action.payload;
        },

        clone_graph: (state, action: PayloadAction<{ id: Graph['id'], activeOnly?: boolean}>) => {
            const graph = state.items.find(g => g.id === action.payload.id);

            if (graph) {
                const clone = deepClone(graph);
                clone.id = generate_graph_id();

                state.items.push(clone);

                state.layout = relayout(state);
                emitRelayoutEvent(state.stacking, state.layout);
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

export const generate_graph_id = () => uid.v4();

export type GraphsState = SliceStateDraft<typeof graphsSlice>;
export const {
    add_graphs, remove_graphs,
    hide_graphs, unhide_graphs,
    clone_graph, edit_graph,
    focus_graph,
    set_layout, set_stacking,
    add_traces, toggle_traces,
    remove_traces, edit_traces,
    sync_timezone,
} = graphsSlice.actions;

export default graphsSlice.reducer;
