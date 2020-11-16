import * as React from 'react';

import './TraceList.css';

const buttons: { label: string, action: string }[][] = [
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

// TODO: LDEV map button

class TraceList
extends React.Component<Props, State> {

    traceClicked = (e: React.MouseEvent<HTMLLIElement>) => {
        // TODO:
        const id = e.currentTarget.dataset.id as Trace['id'];
    }

    actionClicked = (e: React.MouseEvent<HTMLButtonElement>) => {
        // TODO:
        const action = e.currentTarget.dataset.action as (typeof buttons)[0][0]['action'];
    }

    public render() {
        const { traces } = this.props;

        return (
            <>
                <div>
                {buttons.map((row, i) => (
                    <div key={i} className='btn-group btn-group-stretch'>
                    {row.map(btn => (
                        <button className='btn btn-secondary btn-sm' key={btn.action} data-action={btn.action}>{btn.label}</button>
                    ))}
                    </div>
                ))}
                </div>
                <ul className='list-group'>
                {traces.map(t => (
                    <li
                        key={t.id}
                        data-id={t.id}
                        className='list-group-item list-group-item-action'
                        onClick={this.traceClicked}
                        // selected
                    >
                    {t.title}
                    </li>
                ))}
                </ul>
            </>
        );
    }
}

export interface Props {
    traces: Trace[];
}

export interface State {
}

export default TraceList;