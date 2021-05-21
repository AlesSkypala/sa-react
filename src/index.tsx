import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { DataWorker, DataWorkerProxy } from './workers';
import { wrap } from 'comlink';

import { Provider } from 'react-redux';
import store from './redux/store';

// CSS styles
// import './assets/AdminLTE.min.css';
import './assets/fonts.css';
import './assets/theme.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-virtualized/styles.css';
import 'react-contexify/dist/ReactContexify.css';
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
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals(console.log);