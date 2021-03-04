import * as React from 'react';
import { default as Grid, Layout } from 'react-grid-layout';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { AutoSizer } from 'react-virtualized';

const Cols = 12, Rows = 12;
const MarginX = 2, MarginY = 2;

class GraphContainerComponent
    extends React.Component<Props, State> {
    public render() {
        return (
            <div className='content-wrapper' style={{overflowY: 'hidden'}}>
                <AutoSizer>
                    {({ height, width}) => (
                        <Grid
                            layout={this.props.layout}
                            isResizable={!this.props.locked}
                            isDraggable={!this.props.locked}
                            useCSSTransforms={false}

                            cols={Cols}
                            maxRows={Rows}

                            width={width}
                            rowHeight={Math.floor(height / 12) - MarginY}
                            margin={[ MarginX, MarginY ]}
                            compactType={'vertical'}

                            draggableHandle=".graph"
                            onLayoutChange={this.props.onLayoutChange}
                        >
                            {this.props.children}
                        </Grid>
                    )}
                </AutoSizer>
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