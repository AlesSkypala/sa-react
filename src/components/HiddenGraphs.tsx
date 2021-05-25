import { faPlusSquare, faTimes } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Dropdown } from 'react-bootstrap';
import * as React from 'react';
import { connect, unhide_graphs, ReduxProps, remove_graphs } from '../redux';
import Notif from '../services/Notifications';
import { t } from '../locale';
import './HiddenGraphs.scss';


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
                        <Dropdown.Item key={g.id} onClick={this.unhideGraphOrFail(g.id)} disabled={activeCount >= activeMax}>
                            <span className="hidden-graph-title">{g.title}</span>
                            <FontAwesomeIcon icon={faPlusSquare} className="hidden-graph-icon" />
                        </Dropdown.Item>
                    )}
                </Dropdown.Menu>
            </Dropdown>;
        } else {
            return <>
                {hiddenGraphs.map(g =>
                    <div className="hidden-graph" key={g.id}>
                        <span className="hidden-graph-title" onClick={this.unhideGraphOrFail(g.id)}>{g.title}&nbsp;</span>
                        <span className="hidden-graph-close" onClick={this.removeGraph(g.id)}>
                            <FontAwesomeIcon icon={faTimes} className="hidden-graph-icon" />
                        </span>
                    </div>
                )}
            </>;
        }
    }

    unhideGraphOrFail = (id: Graph['id']) => () => {
        const { activeCount, activeMax } = this.props;
        if (activeCount < activeMax) {
            this.props.unhide_graphs(id);
        } else {
            this.showNotif();
        }
    }


    removeGraph = (id: Graph['id']) => () => {
        this.props.remove_graphs(id);
    }

    showNotif = () => {
        Notif.notify(t('warning.noVisibleSlots'), { toastId: 'noVisibleSlots', type: 'warning' });
    }

}

export default connect(storeProps, dispatchProps)(HiddenGraphs);
