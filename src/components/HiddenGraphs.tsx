import { faPlusSquare } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Dropdown } from 'react-bootstrap';
import * as React from 'react';
import { connect, unhide_graphs, ReduxProps, remove_graphs } from '../redux';
import './HiddenGraphs.css';


const dispatchProps = {
    remove_graphs,
    unhide_graphs,
};

const storeProps = (store: RootStore) => ({
    graphs: store.graphs.items,
});

type Props = ReduxProps<typeof storeProps, typeof dispatchProps> & {
    collapsed: boolean
}

interface State { }


class HiddenGraphs extends React.Component<Props, State> {
    render () {
        const hiddenGraphs = this.props.graphs.filter(g => !g.visible);

        if (this.props.collapsed) {
            return <Dropdown>
                <Dropdown.Toggle className='text-white'>
                    Hidden graphs
                </Dropdown.Toggle>
                <Dropdown.Menu>
                    {hiddenGraphs.map(g =>
                        <Dropdown.Item key={g.id} onClick={this.unhideGraphCallback(g.id)}>
                            <span className="hidden-graph-title">{g.title}</span>
                            <FontAwesomeIcon icon={faPlusSquare} className="hidden-graph-icon" />
                        </Dropdown.Item>
                    )}
                </Dropdown.Menu>
            </Dropdown>;
        } else {
            return <>
                {hiddenGraphs.map(g =>
                    <div className="hidden-graph" key={g.id} onClick={this.unhideGraphCallback(g.id)}>
                        <span className="hidden-graph-title">{g.title}</span>
                        <FontAwesomeIcon icon={faPlusSquare} className="hidden-graph-icon" />
                    </div>
                )}
            </>;
        }
    }

    unhideGraphCallback = (id: Graph['id']) => () => {
        this.props.unhide_graphs(id);
    }
}


export default connect(storeProps, dispatchProps)(HiddenGraphs);
