import * as React from 'react';
import { default as Grid, Layout, WidthProvider } from 'react-grid-layout';

import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'

const ResponsiveGrid = WidthProvider(Grid);

class GraphContainerComponent
extends React.Component<Props, State> {
    public render() {
        return (
            <div className='content-wrapper'>
                <ResponsiveGrid
                    layout={this.props.layout}
                    isResizable={!this.props.locked}
                    isDraggable={!this.props.locked}
                    useCSSTransforms
                    cols={12}
                    rowHeight={64}

                    draggableHandle=".graph"

                    onLayoutChange={this.props.onLayoutChange}
                >
                {this.props.children}
                </ResponsiveGrid>
            </div>
        );
    }
}

export interface Props {
    layout?: ContainerLayout;
    locked?: boolean;

    onLayoutChange?(layout: ContainerLayout): void;
}

export interface State {
}

export type ContainerLayout = Layout[];

export default GraphContainerComponent;