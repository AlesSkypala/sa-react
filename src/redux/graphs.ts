import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import debounce from 'lodash.debounce';
import { Layout } from 'react-grid-layout';
import { AppEvents } from '../services';
import { SliceStateDraft } from './helpers';

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

export const graphsSlice = createSlice({
    name: 'graphs',
    initialState: {
        items: [] as Graph[],
        layout: [] as Layout[],
        stacking: 'horizontal' as StackingType,
    },
    reducers: {
        add_graphs: (state, action: PayloadAction<Graph | Graph[]>) => {
            const graphs = action.payload;

            let maxId = state.items.reduce((prev, next) => Math.max(prev, next.id), -1) + 1;

            if (Array.isArray(graphs)) {
                state.items.push(...graphs);
            } else {
                graphs.id = ++maxId;
                state.items.push(graphs);
            }
            
            state.layout = relayout(state);
            emitRelayoutEvent(state.stacking, state.layout);
        },

        remove_graphs: (state, action: PayloadAction<Graph['id'] | Graph['id'][]>) => {
            const ids = action.payload;
            
            if (Array.isArray(ids)) {
                state.items = state.items.filter(g => !ids.includes(g.id));
            } else {
                const idx = state.items.findIndex(g => g.id === ids);

                idx >= 0 && state.items.slice(idx, 1);
            }

            state.layout = relayout(state);
            emitRelayoutEvent(state.stacking, state.layout);
        }
    }
});


export const { add_graphs, remove_graphs } = graphsSlice.actions;

export default graphsSlice.reducer;