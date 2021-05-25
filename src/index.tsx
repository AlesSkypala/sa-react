import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { DataWorker, DataWorkerProxy } from './workers';
import { wrap } from 'comlink';
import Logger from './Logger';

import { Provider } from 'react-redux';
import store from './redux/store';

// CSS styles
import './index.scss';
import 'react-virtualized/styles.css';
import 'react-contexify/dist/ReactContexify.css';
import 'react-toastify/dist/ReactToastify.css';
import { loadTranslations } from './locale';

export const dataWorker = wrap<DataWorkerProxy>(new DataWorker());

loadTranslations();

ReactDOM.render(
    <Provider store={store}>
        <App />
    </Provider>,
    document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals(Logger.debug);