import { configureStore, Middleware } from '@reduxjs/toolkit';
import graphsReducer from './graphs';
import jobsReducer from './jobs';
import settingsReducer from './settings';
import Logger from '../Logger';

const logger: Middleware = () => next => action => {
    Logger.debug(action);
    return next(action);
};

const store =  configureStore({
    reducer: {
        graphs: graphsReducer,
        jobs: jobsReducer,
        settings: settingsReducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false, immutableCheck: false, }).concat(logger),
});

export type RootDispatch = typeof store.dispatch;
export type RootStore = ReturnType<typeof store.getState>

export default store;
