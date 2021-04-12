import * as React from 'react';
import { AutoSizer, List, ListRowProps } from 'react-virtualized';
import { DataService, DialogService } from '../services';
import LdevMapModal from './Modals/LdevMapModal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckSquare, faHdd, faSquare } from '@fortawesome/free-solid-svg-icons';

import './TraceList.css';
// import { withHotKeys } from 'react-hotkeys';

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

class TraceList
    extends React.PureComponent<Props, State> {
    public state: State = {
        sources: [],
        active: undefined,
        numero_uno_in_italia: 0,
    };

    private listRef = React.createRef<HTMLDivElement>();
    public componentDidMount() {
        DataService.getSources().then(sources => this.setState({ sources }));
    }

    traceClicked = (e: React.MouseEvent<HTMLLIElement>) => {
        const id = e.currentTarget.dataset.id as Trace['id'];
        this.props.onSelect(id);
        this.setState({ active: id, numero_uno_in_italia: (this.state.numero_uno_in_italia + 1) % 420 });
        this.listRef.current?.focus();
    }

    actionClicked = (e: React.MouseEvent<HTMLButtonElement>) => {
        const action = e.currentTarget.dataset.action as TraceAction;
        this.props.onAction(action);
    }


    hasLdevMaps = (trace: Trace) => {
        if (!this.state.sources || trace.pipeline.type !== 'data' ||
            !(trace.pipeline as DataNodeDescriptor).dataset.id.startsWith('LDEV')) {
            return;
        }

        const source = this.state.sources.find(s => s.id === (trace.pipeline as DataNodeDescriptor).dataset.source);

        return source && source.features.indexOf('ldev_map') >= 0;
    }

    getLdevId = (trace: Trace) => {
        const { dataset } = (trace.pipeline as DataNodeDescriptor);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return [ dataset.source, dataset.variant! ];
    }

    onLdevClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        const trace = this.props.traces.find(t => t.id === e.currentTarget.dataset.trace);

        if (trace) {
            const ldevId = this.getLdevId(trace);

            // eslint-disable-next-line @typescript-eslint/no-empty-function
            DialogService.open(LdevMapModal, () => { }, { source: ldevId[0], ldev: ldevId[1] });
        }
    }

    rowRenderer = (props: ListRowProps) => {
        const t = this.props.traces[props.index];

        return (
            <li
                key={props.key}
                data-id={t.id}
                style={props.style}
                className={`trace-row ${this.state.active === t.id ? 'active' : ''}`}
                onClick={this.traceClicked}
            >
                <span className='btn-select mr-1'>
                    <FontAwesomeIcon icon={this.props.activeTraces.indexOf(t.id) >= 0 ? faCheckSquare : faSquare} />
                </span>
                <span className='trace-row-title'>{t.title}</span> {this.hasLdevMaps(t) ? (<button className='btn ldev btn-sm' data-trace={t.id} onClick={this.onLdevClick}><FontAwesomeIcon icon={faHdd} /></button>) : undefined}
            </li>
        );
    }

    public render() {
        return (
            <React.Fragment>
                <div>
                    {buttons.map((row, i) => (
                        <div key={i} className='btn-group btn-group-stretch'>
                            {row.map(btn => (
                                <button className='btn btn-secondary btn-sm' key={btn.action} data-action={btn.action} onClick={this.actionClicked}>{btn.label}</button>
                            ))}
                        </div>
                    ))}
                </div>
                <div style={{flexGrow: 1}} tabIndex={0} ref={this.listRef}>
                    <AutoSizer>
                        {({height, width}) => (
                            <List
                                containerProps={{ className: 'list-group' }}
                                height={height}
                                width={width}
                                rowHeight={35}
                                rowCount={this.props.traces.length}
                                rowRenderer={this.rowRenderer}
                                active={this.props.activeTraces}
                                lol={this.state.numero_uno_in_italia}
                                // Before anyone accuses me of the terrible crimes I might have commited
                                // in former Yugoslavia, just let me state that this is a necessity of
                                // react-virtualized in order to redraw the list in cases where changes
                                // occur a level deeper than just the passed props above
                            />
                        )}
                    </AutoSizer>
                </div>
            </React.Fragment>
        );
    }
}

export interface Props {
    traces: Trace[];
    activeTraces: Trace['id'][];

    onSelect(id: Trace['id']): void;
    onAction(action: TraceAction): void;
}

export interface State {
    sources: DataSource[];
    active: Trace['id'] | undefined;
    numero_uno_in_italia: number;
}

export default TraceList;