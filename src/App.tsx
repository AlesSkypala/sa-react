import React from 'react';
import { GraphContainer, Header, SideMenu, ContainerLayout, GraphComponent } from './components';

import './App.css';
import { ModalPortal, ImportModal, ImportResult } from './components/Modals';
import { DialogService } from './services';

class App
extends React.Component<{}, AppState> {
    public state: AppState = {
        locked: true,

        graphs: [],
        layout: [],
    };

    toggleLock = () => this.setState({ locked: !this.state.locked });
    addGraph = () => DialogService.open(ImportModal, this.onAddGraph, { isGraph: true });

    onAddGraph = (result: Graph) => {
        if (!result) { return; }

        const { graphs } = this.state;
        
        result.id = graphs.length > 0 ? Math.max(...graphs.map(g => g.id)) + 1 : 0;
        this.setState({ graphs: [ ...graphs, result ]})
    }

    onRelayout = (layout: ContainerLayout) => this.setState({ layout });

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
                <GraphContainer
                    layout={this.state.layout}
                    locked={this.state.locked}
                    onLayoutChange={this.onRelayout}
                >
                    {this.state.graphs.map(g => (
                        <GraphComponent key={g.id} {...g} />
                    ))}
                </GraphContainer>
                <ModalPortal />
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
