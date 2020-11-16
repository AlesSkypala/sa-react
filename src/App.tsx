import React from 'react';
import { GraphContainer, Header, SideMenu, ContainerLayout, GraphComponent } from './components';

import './App.css';

class App
extends React.Component<{}, AppState> {
    public state: AppState = {
        locked: true,

        graphs: [],
        layout: [],
    };

    toggleLock = () => this.setState({ locked: !this.state.locked });
    addGraph = () => console.log('Adding a graph');

    public render() {
        return (
            <>
                <Header
                    layoutUnlocked={!this.state.locked}
                    onToggleLock={this.toggleLock}
                    onAddGraph={this.addGraph}
                />
                <SideMenu>

                </SideMenu>
                <GraphContainer layout={this.state.layout}>
                    {this.state.graphs.map(g => (
                        <GraphComponent key={g.id} {...g} />
                    ))}
                </GraphContainer>
            </>
        );
    }
}

// TODO: trace import and graph creation modal
// TODO: LDEV map modal

export interface AppState {
    locked: boolean;
    
    graphs: Graph[];
    layout: ContainerLayout;
}

export default App;
