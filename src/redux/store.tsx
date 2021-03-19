import { configureStore } from '@reduxjs/toolkit';
import graphsReducer from './graphs';
import modalsReducer from './modals';

const store =  configureStore({
    reducer: {
        graphs: graphsReducer,
        modals: modalsReducer,
    }
});

export type RootDispatch = typeof store.dispatch;
export type RootStore = ReturnType<typeof store.getState>

export default store;