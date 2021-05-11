import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { SliceStateDraft } from './helpers';
import type { default as DataJob } from '../services/DataJob';
import { add_traces } from './graphs';
import { randomColorDark } from '../utils/color';


export const invoke_job = createAsyncThunk(
    'jobs/invoke',
    async (job: DataJob, { dispatch }) => {
        dispatch(insert_running({
            handle: job.handle,
            state: 'pending',
            relatedGraphs: job.relatedGraphs,
        }));

        let result: DataJobResult;
        try {
            result = await job.invoke();
            dispatch(change_state({ handle: job.handle, state: 'completed' }));
        } catch (err) {
            console.log(err);
            dispatch(change_state({ handle: job.handle, state: 'error' }));
            return;
        }

        if (job.relatedGraphs.length > 0) {
            const traces: Trace[] | undefined = result.loadedTraces && Object.keys(result.loadedTraces)?.map(t => ({
                id: t,
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                handle: result.loadedTraces![t],
                title: t.split('::').reverse()[0],
                style: { width: 1, color: randomColorDark() },
                active: true,
            }));

            traces && job.relatedGraphs.forEach(g => dispatch(add_traces({ id: g, traces })));
        }
    }
);

export type PendingDataJob = {
    handle: number,
    state: DataJobState,
    relatedGraphs: Graph['id'][],
};

export const jobsSlice = createSlice({
    name: 'jobs',
    initialState: {
        items: {} as { [handle: number]: PendingDataJob },
    },
    reducers: {
        insert_running: (_state, action: PayloadAction<PendingDataJob>) => {
            _state.items[action.payload.handle] = action.payload;
        },
        change_state: (_state, action: PayloadAction<Pick<PendingDataJob, 'handle' | 'state'>>) => {
            const { handle, state } = action.payload;

            if (handle in _state.items) {
                if (state === 'completed') {
                    delete _state.items[handle];
                } else {
                    _state.items[handle].state = state;
                }
            }
        },
    },
});

export type JobsState = SliceStateDraft<typeof jobsSlice>;
export const {
    insert_running,
    change_state,
} = jobsSlice.actions;

export default jobsSlice.reducer;
