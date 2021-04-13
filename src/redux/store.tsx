import { configureStore } from '@reduxjs/toolkit';
import graphsReducer from './graphs';
import jobsReducer from './jobs';

const store =  configureStore({
    reducer: {
        graphs: graphsReducer,
        jobs: jobsReducer,
    }
});

export type RootDispatch = typeof store.dispatch;
export type RootStore = ReturnType<typeof store.getState>

export default store;