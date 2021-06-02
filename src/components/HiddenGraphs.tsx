import { faTimes } from '@fortawesome/free-solid-svg-icons';
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

interface State {
    // it do be dropped down sometimes
    dropdownDroppedDown: boolean
}


class HiddenGraphs extends React.Component<Props, State> {
    state = { dropdownDroppedDown: false }

    render () {
        const hiddenGraphs = this.props.graphs.filter(g => !g.visible);
        const { activeCount, activeMax, collapsed } = this.props;
        const { dropdownDroppedDown } = this.state;

        return <>
            <Dropdown
                show={dropdownDroppedDown}
                onToggle={this.toggleDropdown}
                style={ collapsed ? {} : { display: 'none'} /* hide but don't remove from DOM */ }
            >
                <Dropdown.Toggle className='text-white'>
                    Hidden graphs
                </Dropdown.Toggle>
                <Dropdown.Menu>
                    {collapsed && // render this if there's not enough space
                        hiddenGraphs.map(g =>
                            <Dropdown.Item
                                key={g.id}
                                onClick={this.unhideGraphOrFail(g.id)}
                                disabled={activeCount >= activeMax}
                                className="hidden-graph collapsed"
                            >
                                <span className="hidden-graph-title">{g.title}</span>
                                <span className="hidden-graph-close" onClick={this.removeGraph(g.id)}>
                                    <FontAwesomeIcon icon={faTimes} className="hidden-graph-icon" />
                                </span>
                            </Dropdown.Item>
                        )
                    }
                </Dropdown.Menu>
            </Dropdown>
            {!collapsed && // only render this if there's enough space
                hiddenGraphs.map(g =>
                    <div className="hidden-graph uncollapsed" key={g.id}>
                        <span className="hidden-graph-title" onClick={this.unhideGraphOrFail(g.id)}>{g.title}&nbsp;</span>
                        <span className="hidden-graph-close" onClick={this.removeGraph(g.id)}>
                            <FontAwesomeIcon icon={faTimes} className="hidden-graph-icon" />
                        </span>
                    </div>
                )
            }
        </>;
    }

    toggleDropdown = (isOpen: boolean) => {
        this.setState({ dropdownDroppedDown: isOpen });
    }

    unhideGraphOrFail = (id: Graph['id']) => () => {
        const { activeCount, activeMax } = this.props;
        if (activeCount < activeMax) {
            this.props.unhide_graphs(id);
        } else {
            this.showNotif();
        }
    }


    removeGraph = (id: Graph['id']) => (e: React.MouseEvent) => {
        this.props.remove_graphs(id);
        return this.preventStuff(e);
    }

    preventStuff = (e: React.SyntheticEvent) => {
        // Act 1. (Tony Stark's office)
        // Tony Stark: (stands at his desk)
        // Peter Parker and Marry Jane: (enter)
        // Tony Stark: (looks up towards the newcomers)
        // Peter Parker: Dear sir, accept my most humble apology. I wast late, for i wast performing activities.
        // Marry Jame: Those activities – yond wast i.
        // Tony Stark: (laughs) Peter, thy fiancée is most wondrous.
        e.preventDefault();
        e.stopPropagation();
        return false;
    }

    showNotif = () => {
        Notif.notify(t('warning.noVisibleSlots'), { toastId: 'noVisibleSlots', type: 'warning' });
    }

}

export default connect(storeProps, dispatchProps)(HiddenGraphs);
