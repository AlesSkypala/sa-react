import { configureStore } from '@reduxjs/toolkit';
import graphsReducer from './graphs';
import jobsReducer from './jobs';
import settingsReducer from './settings';

const store =  configureStore({
    reducer: {
        graphs: graphsReducer,
        jobs: jobsReducer,
        settings: settingsReducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false, immutableCheck: false, }),
});

export type RootDispatch = typeof store.dispatch;
export type RootStore = ReturnType<typeof store.getState>

export default store;
