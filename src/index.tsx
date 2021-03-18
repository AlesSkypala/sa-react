import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { PlotWorker, PlotWorkerProxy } from './workers';
import { wrap } from 'comlink';

import './assets/AdminLTE.min.css';
import './assets/skin-blue.min.css';
import './assets/fonts.css';
import './assets/custom.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-virtualized/styles.css';
import 'react-contexify/dist/ReactContexify.css';

export const plotWorker = wrap<PlotWorkerProxy>(new PlotWorker());

ReactDOM.render(
    <App />,
    document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals(console.log);