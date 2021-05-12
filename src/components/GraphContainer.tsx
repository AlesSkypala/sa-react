import * as React from 'react';
import { default as Grid } from 'react-grid-layout';
import { AutoSizer } from 'react-virtualized';
import { connect, ReduxProps, set_layout } from '../redux';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const Cols = 12, Rows = 12;
const MarginX = 2, MarginY = 2;

class GraphContainerComponent
    extends React.Component<Props, State> {
    onLayoutChange = (layout: Grid.Layout[]) => {
        this.props.set_layout(layout);
    }

    public render() {
        const { layout, stacking, locked } = this.props;

        return (
            <div className='content-wrapper'>
                <AutoSizer>
                    {({ height, width}) => (
                        <Grid
                            layout={layout}
                            isResizable={!locked && stacking === 'freeform'}
                            isDraggable={!locked}
                            useCSSTransforms

                            cols={Cols}
                            maxRows={Rows}

                            width={width}
                            rowHeight={Math.floor(height / 12) - MarginY}
                            margin={[ MarginX, MarginY ]}
                            compactType={'vertical'}

                            draggableHandle=".graph"
                            onLayoutChange={this.onLayoutChange}
                        >
                            {this.props.children}
                        </Grid>
                    )}
                </AutoSizer>
            </div>
        );
    }
}

const dispatchProps = {
    set_layout,
};

const storeProps = (store: RootStore) => ({
    layout: store.graphs.layout,
    stacking: store.graphs.stacking,
});

type Props = ReduxProps<typeof storeProps, typeof dispatchProps> & {
    locked?: boolean;
    children?: React.ReactNode;
};

interface State { }

export default connect(storeProps, dispatchProps)(GraphContainerComponent);
