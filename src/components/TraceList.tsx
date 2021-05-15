import * as React from 'react';
import { AutoSizer, List as VirtualizedList, ListRowProps as VirtualizedRowProps } from 'react-virtualized';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { DataService, DialogService } from '../services';
import LdevMapModal from './Modals/LdevMapModal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckSquare, faSitemap, faSquare } from '@fortawesome/free-solid-svg-icons';
import { colorToHex } from '../utils/color';

import './TraceList.css';
import { getLdevMode, toLdevInternal, toLdevInternalFromVariant } from '../utils/ldev';
import { splitTraceId } from '../utils/trace';
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

export interface Props {
    traces: Trace[];

    onSelect(id: Trace['id'], toggle: boolean): void;
    onAction(action: TraceAction): void;
}

export interface State {
    ldevMap: { [key: string]: string };
    active: Trace['id'] | undefined;
}

class TraceList extends React.PureComponent<Props, State> {
    public state: State = {
        ldevMap: {},
        active: undefined,
    };

    private listRef = React.createRef<HTMLDivElement>();

    public async componentDidUpdate(prevProps: Props) {
        await this.fetchLdevNames(prevProps);
    }

    public async componentDidMount() {
        await this.fetchLdevNames();
    }

    public async fetchLdevNames(prevProps?: Props) {
        if (prevProps?.traces !== this.props.traces) {

            if (prevProps?.traces && this.props.traces && this.props.traces.length === prevProps.traces.length) {
                const ids = new Set(this.props.traces.map(t => t.id));

                if (!prevProps.traces.some(t => !ids.has(t.id))) {
                    return;
                }
            }

            console.log('Aight imma download them ldev names');
            const sources = this.props.traces.map(t => t.id.split('::')[0])
                .filter((v, i, a) => a.indexOf(v) === i); // Select distinct sources

            const ldevMap: { [key: string]: string } = {};

            for (const source of sources) {
                const ldevs = this.props.traces
                    .filter(t => getLdevMode(t) === 'ldev')
                    .map(t => toLdevInternal(t, 'ldev'));

                const map = await DataService.getLdevMap(source, ldevs, 'ldev');

                for (const ldev of map) {
                    ldevMap[`${source}::${ldev.id}`.toLowerCase()] = ldev.name;
                }
            }

            this.setState({ ldevMap });
        } else {
            console.log('Nah bro, I don\'t feel like downloading ldev names');
        }
    }

    traceClicked = (e: React.MouseEvent<HTMLLIElement>) => {
        const id = e.currentTarget.dataset.id as Trace['id'];
        const active = e.currentTarget.dataset.active === 'true';
        this.props.onSelect(id, !active);
        this.setState({ active: id });
        this.listRef.current?.focus();
    }

    actionClicked = (e: React.MouseEvent<HTMLButtonElement>) => {
        const action = e.currentTarget.dataset.action as TraceAction;
        this.props.onAction(action);
    }

    hasLdevMaps = (trace: Trace) => {
        return DataService.hasLdevMap(trace.id); // trace.features.includes('ldev_map');
    }

    getLdevId = (trace: Trace) => {
        const [ source,, variant] = splitTraceId(trace);

        return { source, ldev: toLdevInternalFromVariant(variant as string, 'ldev') };
    }

    onLdevClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        const trace = this.props.traces.find(t => t.id === e.currentTarget.dataset.trace);

        if (trace) {
            const ldevId = this.getLdevId(trace);
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            DialogService.open(LdevMapModal, () => { }, ldevId);
        }
    }

    rowRenderer = (props: VirtualizedRowProps) => {
        return <TraceListRow key={props.index} virtualizedRow={props} parentList={this} />;
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
                            <VirtualizedList
                                containerProps={{ className: 'list-group' }}
                                style={{ background: 'white' }}
                                height={height}
                                width={width}
                                rowHeight={25}
                                rowCount={this.props.traces.length}
                                rowRenderer={this.rowRenderer}
                                map={this.state.ldevMap}
                            />
                        )}
                    </AutoSizer>
                </div>
            </React.Fragment>
        );
    }
}

export default TraceList;

interface RowProps {
    virtualizedRow: VirtualizedRowProps;
    parentList: TraceList;
}
interface TraceListRowState {
    showTooltip: boolean;
}

class TraceListRow extends React.Component<RowProps, TraceListRowState> {
    public state = { showTooltip: false };
    private spanRef = React.createRef<HTMLElement>();

    checkForEllipsis() {
        const e = this.spanRef.current;
        const showTooltip = e !== null && e.offsetWidth < e.scrollWidth;
        if (this.state.showTooltip !== showTooltip) this.setState({ showTooltip });
    }

    componentDidMount() {
        this.checkForEllipsis();
    }

    componentDidUpdate() {
        this.checkForEllipsis();
    }

    render() {
        const { virtualizedRow, parentList } = this.props;
        const { showTooltip } = this.state;

        const trace = parentList.props.traces[virtualizedRow.index];
        const color = colorToHex(trace.style.color);

        const hasMap = parentList.hasLdevMaps(trace);
        const { source, ldev } = parentList.getLdevId(trace);
        const ldevId = `${source}::${ldev.substr(0, 8)}`.toLowerCase();

        const ldevName = parentList.state.ldevMap[ldevId];
        const rowTitle = trace.title + (ldevName ? ` [${ldevName}]` : '');
        const isActive = trace.active;

        return (
            <li
                key={virtualizedRow.key}
                data-id={trace.id}
                data-active={isActive ? 'true' : 'false'}
                style={virtualizedRow.style}
                className={`trace-row-outer ${parentList.state.active === trace.id ? 'active' : ''}`}
                onClick={parentList.traceClicked}
            >
                <OverlayTrigger
                    trigger={showTooltip ? [ 'focus', 'hover' ] : []}
                    placement='right'
                    container={document.getElementById('context-menu')}
                    overlay={<Tooltip id={`trace-row-tooltip-${ldevId}`}>{rowTitle}</Tooltip>}
                >
                    <div className="trace-row-inner">
                        <span className='btn-select mr-1 trace-color-indicator' style={{color}}>
                            <FontAwesomeIcon icon={isActive ? faCheckSquare : faSquare} />
                        </span>
                        <span className='trace-row-title' ref={this.spanRef}>{rowTitle}</span>
                        { hasMap && (<button className='btn ldev btn-sm' data-trace={trace.id} onClick={parentList.onLdevClick}><FontAwesomeIcon icon={faSitemap} /></button>) }
                    </div>
                </OverlayTrigger>
            </li>
        );
    }
}
