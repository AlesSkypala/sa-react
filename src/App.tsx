import React from 'react';
import { GraphContainer, Header, SideMenu, ContainerLayout, GraphComponent } from './components';

import './App.css';
import { ModalPortal, ImportModal, ImportResult } from './components/Modals';
import { DialogService } from './services';

class App
extends React.Component<{}, AppState> {
    public state: AppState = {
        locked: true,
        focused: -1,

        graphs: [],
        layout: [],
    };

    toggleLock = () => this.setState({ locked: !this.state.locked });
    addGraph = () => DialogService.open(ImportModal, this.onAddGraph, { isGraph: true });

    onAddGraph = (result: Graph) => {
        if (!result) { return; }

        const { graphs } = this.state;
        
        result.id = graphs.length > 0 ? Math.max(...graphs.map(g => g.id)) + 1 : 0;
        this.setState({
            graphs: [ ...graphs, result ],
            layout: [ ...this.state.layout, {
                i: String(result.id), x:0, y: 0, w: 6, h: 4
            }]
        });
    }

    onRelayout = (layout: ContainerLayout) => this.setState({ layout });
    focusGraph = (e: React.MouseEvent<HTMLDivElement>) => {
        const graphId = e.currentTarget.dataset.graph as string;

        this.setState({ focused: Number.parseInt(graphId) });
    }
    onRemoveGraph = (id: number) => this.setState({ graphs: [ ...this.state.graphs.filter(g => g.id !== id) ]});

    public render() {
        return (
            <>
                <Header
                    layoutUnlocked={!this.state.locked}
                    onToggleLock={this.toggleLock}
                    onAddGraph={this.addGraph}
                />
                <SideMenu
                    selectedGraph={this.state.graphs.find(g => g.id === this.state.focused)}
                />
                <GraphContainer
                    layout={this.state.layout}
                    locked={this.state.locked}
                    onLayoutChange={this.onRelayout}
                >
                    {this.state.graphs.map(g => (
                        <div
                            key={String(g.id)}
                            data-graph={g.id}
                            onClick={this.focusGraph}
                        >
                            <GraphComponent {...g} focused={g.id === this.state.focused} onRemove={this.onRemoveGraph} />
                        </div>
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
    focused: Graph['id'];
    
    graphs: Graph[];
    layout: ContainerLayout;
}

export default App;
