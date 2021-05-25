import { faPlusSquare } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Dropdown } from 'react-bootstrap';
import * as React from 'react';
import { connect, unhide_graphs, ReduxProps, remove_graphs } from '../redux';
import './HiddenGraphs.scss';
import Notif from '../services/Notifications';
import { t } from '../locale';

const dispatchProps = {
    remove_graphs,
    unhide_graphs,
};

const storeProps = (store: RootStore) => ({
    graphs: store.graphs.items,
    activeCount: store.graphs.items.filter(g => g.visible).length,
    activeMax: store.settings.activeContexts,
});

type Props = ReduxProps<typeof storeProps, typeof dispatchProps> & {
    collapsed: boolean
}

interface State { }


class HiddenGraphs extends React.Component<Props, State> {
    render () {
        const hiddenGraphs = this.props.graphs.filter(g => !g.visible);
        const { activeCount, activeMax } = this.props;

        if (this.props.collapsed) {
            return <Dropdown>
                <Dropdown.Toggle className='text-white'>
                    Hidden graphs
                </Dropdown.Toggle>
                <Dropdown.Menu>
                    {hiddenGraphs.map(g =>
                        <Dropdown.Item key={g.id} onClick={this.unhideGraphCallback(g.id)} disabled={activeCount >= activeMax}>
                            <span className="hidden-graph-title">{g.title}</span>
                            <FontAwesomeIcon icon={faPlusSquare} className="hidden-graph-icon" />
                        </Dropdown.Item>
                    )}
                </Dropdown.Menu>
            </Dropdown>;
        } else {
            return <>
                {hiddenGraphs.map(g =>
                    <div className="hidden-graph" key={g.id} onClick={activeCount < activeMax ? this.unhideGraphCallback(g.id) : this.showNotif}>
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

    showNotif = () => {
        Notif.notify(t('warning.noVisibleSlots'), { toastId: 'noVisibleSlots', type: 'warning' });
    }
}


export default connect(storeProps, dispatchProps)(HiddenGraphs);
