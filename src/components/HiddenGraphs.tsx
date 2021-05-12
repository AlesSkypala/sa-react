import { faPlusSquare } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as React from 'react';
import { connect, unhide_graphs, ReduxProps, remove_graphs } from '../redux';
import './HiddenGraphs.css';

class HiddenGraphs extends React.Component<Props, State> {
    render () {
        const hiddenGraphs = this.props.graphs.filter(g => !g.visible);
        return <>
            {hiddenGraphs.map(g =>
                <div className="hidden-graph" key={g.id} onClick={this.unhideGraphCallback(g.id)}>
                    <span className="hidden-graph-title">{g.title}</span>
                    <FontAwesomeIcon icon={faPlusSquare} className="hidden-graph-icon" />
                </div>
            )}
        </>;
    }

    unhideGraphCallback = (id: Graph['id']) => () => {
        this.props.unhide_graphs(id);
    }
}


const dispatchProps = {
    remove_graphs,
    unhide_graphs,
};

const storeProps = (store: RootStore) => ({
    graphs: store.graphs.items,
});

type Props = ReduxProps<typeof storeProps, typeof dispatchProps> & {

}

interface State { }

export default connect(storeProps, dispatchProps)(HiddenGraphs);
