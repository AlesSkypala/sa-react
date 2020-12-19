import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { DataWorker } from './workers';

import './assets/AdminLTE.min.css';
import './assets/skin-blue.min.css';
import './assets/fonts.css';
import './assets/custom.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-virtualized/styles.css'

export const dataWorker = new DataWorker();
dataWorker.postMessage({ action: 'test' });
(window as any).dataWorker = dataWorker;

ReactDOM.render(
  <App />,
  document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals(console.log);