import React from 'react';
import { connect, ReduxProps, graph_action } from '../redux';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {  } from '@fortawesome/free-solid-svg-icons';

import './ActionsMenu.scss';


const storeProps = (state: RootStore) => ({
    graphs: state.graphs.items,
    focused: state.graphs.focused,
});

const dispatchProps = {
    graph_action,
};

interface Props extends ReduxProps<typeof storeProps, typeof dispatchProps> {}

interface State {}


const buttons: { label: string, action: TraceAction }[][] = [
    [
        { label: 'Filter', action: 'filter' },
        { label: 'SelUniq', action: 'sel-unq' },
        { label: 'Search', action: 'search' },
        { label: 'Thres', action: 'tres' }
    ],
    [
        { label: 'AllSel', action: 'sel-all' },
        { label: 'InvSel', action: 'inv' },
        { label: 'DeSel', action: 'des' },
        { label: 'DelZero', action: 'del-zero' }
    ],
    [
        { label: 'Sum', action: 'sum' },
        { label: 'Average', action: 'avg' },
        { label: 'DelUnsel', action: 'del-unsel' },
        { label: 'Sort', action: 'sort' } ],
    [
        { label: 'Name Sync', action: 'name-sync' },
        { label: 'Bind Sync', action: 'bind-sync' },
        { label: 'Zoom Sync', action: 'zoom-sync' }
    ],
    // { label: 'DelSel', action: 'del-sel' },
];

class ActionsMenu extends React.Component<Props, State> {
    render() {
        return <div>
            {buttons.map((row, i) => (
                <div key={i} className='btn-group btn-group-stretch'>
                    {row.map(btn => (
                        <button className='btn btn-secondary btn-sm' key={btn.action} data-action={btn.action} onClick={this.actionClicked}>{btn.label}</button>
                    ))}
                </div>
            ))}
        </div>;
    }

    selectedGraph = () => this.props.graphs.find(g => g.id === this.props.focused);

    actionClicked = (e: React.MouseEvent<HTMLButtonElement>) => {
        const action = e.currentTarget.dataset.action as TraceAction;
        const activeGraph = this.selectedGraph();

        if (activeGraph === undefined) return;

        this.props.graph_action({ id: activeGraph.id, action});
    }

}

export default connect(storeProps, dispatchProps)(ActionsMenu);
