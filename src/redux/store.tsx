import { configureStore } from '@reduxjs/toolkit';
import graphsReducer from './graphs';

const store =  configureStore({
    reducer: {
        graphs: graphsReducer,
    }
});

export type RootDispatch = typeof store.dispatch;
export type RootStore = ReturnType<typeof store.getState>

export default store;