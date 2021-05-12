import * as React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle } from '@fortawesome/free-solid-svg-icons';
import { Button } from 'react-bootstrap';
import TraceList from './TraceList';
import { connect } from 'react-redux';
import { ReduxProps, graph_action, edit_graph, toggle_traces } from '../redux';
import { t } from '../locale';
import './SideMenu.css';

class SideMenuComponent
    extends React.Component<Props, State> {

    onAction = (action: TraceAction) => this.props.graph_action({ id: this.props.selectedGraph?.id ?? '', action});
    onTraceSelect = (id: Trace['id'], toggle: boolean) => {
        if (this.props.selectedGraph) {
            this.props.toggle_traces({ id: this.props.selectedGraph.id, traces: new Set([ id ]), val: toggle });
        }
    };

    public render() {
        const { selectedGraph } = this.props;

        return (
            <aside className='main-sidebar'>
                <section className='sidebar'>
                    {selectedGraph ? (
                        <TraceList
                            traces={selectedGraph.traces}
                            onSelect={this.onTraceSelect}
                            onAction={this.onAction}
                        />
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
    toggle_traces,
};

type Props = ReduxProps<() => unknown, typeof dispatchProps> & {
    selectedGraph?: Graph;

    onTraceAddClick(): void;
}

interface State { }

export default connect(undefined, dispatchProps)(SideMenuComponent);