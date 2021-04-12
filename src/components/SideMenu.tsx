import * as React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle } from '@fortawesome/free-solid-svg-icons';
import { Button } from 'react-bootstrap';

import './SideMenu.css';
import TraceList from './TraceList';
import { connect } from 'react-redux';
import { ReduxProps, graph_action, edit_graph } from '../redux';
import { t } from '../locale';

class SideMenuComponent
    extends React.Component<Props, State> {

    onAction = (action: TraceAction) => this.props.graph_action({ id: this.props.selectedGraph?.id ?? -1, action});
    onTraceSelect = (id: Trace['id']) => {
        if (this.props.selectedGraph) {

            const activeTraces = new Set(this.props.selectedGraph.activeTraces);

            if (activeTraces.has(id)) {
                activeTraces.delete(id);
            } else {
                activeTraces.add(id);
            }

            this.props.edit_graph({
                id: this.props.selectedGraph.id,
                activeTraces,
            });
        }
    };

    public render() {
        const { selectedGraph } = this.props;

        return (
            <aside className='main-sidebar'>
                <section className='sidebar'>
                    {selectedGraph ? (
                        <>
                            <ul className="sidebar-menu">
                                <li className="header d-flex align-items-center pr-1 py-0">
                                    {t('sidemenu.traces').toUpperCase()}
                                    <Button
                                        variant='link'
                                        className='btn-menu active text-secondary'
                                        style={{ marginLeft: 'auto'}}
                                        onClick={this.props.onTraceAddClick}
                                    >
                                        <FontAwesomeIcon icon={faPlusCircle} />
                                    </Button>
                                </li>
                            </ul>
                            <TraceList
                                traces={selectedGraph.traces}
                                activeTraces={selectedGraph.activeTraces}

                                onSelect={this.onTraceSelect}
                                onAction={this.onAction}
                            />
                        </>
                    ) : (
                        <ul className='sidebar-menu'>
                            <li className='header'>{t('sidemenu.choose').toUpperCase()}</li>
                        </ul>
                    )}
                    {this.props.children}
                </section>
            </aside>
        );
    }
}

const dispatchProps = {
    graph_action,
    edit_graph,
};

type Props = ReduxProps<() => unknown, typeof dispatchProps> & {
    selectedGraph?: Graph;

    onTraceAddClick(): void;
}

interface State { }

export default connect(undefined, dispatchProps)(SideMenuComponent);