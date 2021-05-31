import * as React from 'react';
import TraceList from './TraceList';
import { connect } from 'react-redux';
import { ReduxProps, graph_action, edit_graph, toggle_traces, remove_traces, edit_traces } from '../redux';
import { t } from '../locale';
import './SideMenu.css';
import { DialogService } from '../services';
import TraceEditModal from './Modals/TraceEditModal';

class SideMenuComponent
    extends React.Component<Props, State> {

    onAction = (action: TraceAction) => this.props.graph_action({ id: this.props.selectedGraph?.id ?? '', action});
    onTraceSelect = (id: Trace['id'], toggle: boolean) => {
        if (this.props.selectedGraph) {
            this.props.toggle_traces({ id: this.props.selectedGraph.id, traces: new Set([ id ]), val: toggle });
        }
    };
    onDelete = (trace: Trace) => {
        if (this.props.selectedGraph) {
            this.props.remove_traces({ id: this.props.selectedGraph.id, traces: new Set([ trace.id ]) });
        }
    }
    onEdit = (trace: Trace) => {
        DialogService.open(
            TraceEditModal,
            (res) => {
                if (res && this.props.selectedGraph) {
                    this.props.edit_traces({
                        id: this.props.selectedGraph.id,
                        traces: new Set([ trace.id ]),
                        edit: res,
                    });
                }
            },
            {
                trace,
            }
        );
    }

    public render() {
        const { selectedGraph } = this.props;

        return (
            <aside className='main-sidebar'>
                <section className='sidebar'>
                    {selectedGraph ? (
                        <TraceList
                            traces={selectedGraph.traces}
                            darkMode={this.props.darkMode}
                            onSelect={this.onTraceSelect}
                            onAction={this.onAction}
                            onDelete={this.onDelete}
                            onEdit={this.onEdit}
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
    remove_traces,
    edit_traces,
};

const storeProps = (store: RootStore) => ({
    darkMode: store.settings.darkMode,
});

type Props = ReduxProps<typeof storeProps, typeof dispatchProps> & {
    selectedGraph?: Graph;

    onTraceAddClick(): void;
}

interface State { }

export default connect(storeProps, dispatchProps)(SideMenuComponent);