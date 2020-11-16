import React from 'react';
import { Header, SideMenu } from './components';

import './App.css';

class App
extends React.Component {

    public render() {
        return (
            <>
                <Header />
                <SideMenu />
                <div className='content-wrapper'>
                Testasd
                </div>
            </>
        );
    }
}

export default App;
