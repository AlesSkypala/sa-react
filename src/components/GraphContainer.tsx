import * as React from 'react';
import { default as Grid, Layout } from 'react-grid-layout';

class GraphContainerComponent
extends React.Component<Props, State> {
    public render() {
        return (
            <div className='content-wrapper'>
                <Grid
                    layout={this.props.layout}
                    isResizable={!this.props.locked}
                    isDraggable={!this.props.locked}
                    useCSSTransforms
                    style={{ height: '100%'}}

                    onLayoutChange={this.props.onLayoutChange}
                >
                {this.props.children}
                </Grid>
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