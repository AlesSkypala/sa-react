import * as React from 'react';
import { AutoSizer, List as VirtualizedList, ListRowProps as VirtualizedRowProps } from 'react-virtualized';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSitemap } from '@fortawesome/free-solid-svg-icons';
import { faCheckSquare, faSquare } from '@fortawesome/free-regular-svg-icons';

import { DataService, DialogService } from '../services';
import { connect, ReduxProps, toggle_traces, remove_traces, edit_traces } from '../redux';
import { getLdevMode, toLdevInternal, toLdevInternalFromVariant } from '../utils/ldev';
import { splitTraceId } from '../utils/trace';
import { colorToHex } from '../utils/color';
import { t } from '../locale';

import LdevMapModal from './Modals/LdevMapModal';
import TraceEditModal from './Modals/TraceEditModal';
import ContextMenu from './ContextMenu';

import './TraceList.scss';


const dispatchProps = {
    toggle_traces,
    remove_traces,
    edit_traces,
};

const storeProps = (store: RootStore) => ({
    darkMode: store.settings.darkMode,
    selectedGraph: store.graphs.focused,
});

export interface Props
extends ReduxProps<typeof storeProps, typeof dispatchProps> {
    traces: Trace[];
    darkMode: boolean;
}

export interface State {
    ldevMap: { [key: string]: string };
    active: Trace['id'] | undefined;
    contextTrace: Trace | undefined;
}

class TraceList extends React.PureComponent<Props, State> {
    public state: State = {
        ldevMap: {},
        active: undefined,
        contextTrace: undefined,
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

            const sources = this.props.traces.map(t => t.id.split('::')[0])
                .filter((v, i, a) => a.indexOf(v) === i); // Select distinct sources

            const ldevMap: { [key: string]: string } = {};

            for (const source of sources) {
                if (source === 'local') continue;

                const ldevs = this.props.traces
                    .filter(t => getLdevMode(t) === 'ldev')
                    .map(t => toLdevInternal(t, 'ldev'));

                if (ldevs.length <= 0) continue;

                const map = await DataService.getLdevMap(source, ldevs, 'ldev');

                for (const ldev of map) {
                    ldevMap[`${source}::${ldev.id}`.toLowerCase()] = ldev.name;
                }
            }

            this.setState({ ldevMap });
        }
    }

    traceClicked = (e: React.MouseEvent<HTMLLIElement>) => {
        const id = e.currentTarget.dataset.id as Trace['id'];
        const active = e.currentTarget.dataset.active === 'true';
        this.setState({ active: id });
        this.listRef.current?.focus();

        const { selectedGraph } = this.props;
        if (selectedGraph) {
            this.props.toggle_traces({ id: selectedGraph, traces: new Set([ id ]), val: !active });
        }
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
        return <TraceListRow key={props.index} virtualizedRow={props} parentList={this} onContext={this.onContext} />;
    }

    onContext = (trace: Trace, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        this.setState({ contextTrace: trace });
        ContextMenu.invoker('trace-list-menu')(e);
    }

    onContextItem = ({ data }: { data?: 'del' | 'edit' }) => {
        const trace = this.state.contextTrace;
        const { selectedGraph } = this.props;
        if (!trace || !selectedGraph) return;

        switch (data) {
            case 'del':
                this.props.remove_traces({ id: selectedGraph, traces: new Set([ trace.id ]) });
                return;
            case 'edit':
                this.onEdit(trace);
                return;
        }
    }

    onEdit = (trace: Trace) => {
        DialogService.open(
            TraceEditModal,
            (res) => {
                if (res && this.props.selectedGraph) {
                    this.props.edit_traces({
                        id: this.props.selectedGraph,
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
        const { contextTrace } = this.state;

        return <>
            <div style={{flexGrow: 1}} tabIndex={0} ref={this.listRef}>
                <AutoSizer>
                    {({height, width}) => (
                        <VirtualizedList
                            containerProps={{ className: 'list-group' }}
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
            <ContextMenu
                id='trace-list-menu'
                darkMode={this.props.darkMode}
                tree={[
                    { type: 'item', text: t('graph.context.deleteTrace'), show: Boolean(contextTrace), data: 'del',  onClick: this.onContextItem },
                    { type: 'item', text: t('graph.context.editTrace'),   show: Boolean(contextTrace), data: 'edit', onClick: this.onContextItem },
                ]}
            />
        </>;
    }
}

interface RowProps {
    virtualizedRow: VirtualizedRowProps;
    parentList: TraceList;
    onContext(trace: Trace, e: React.MouseEvent): void;
}
interface TraceListRowState {
    showTooltip: boolean;
}

class TraceListRow extends React.Component<RowProps, TraceListRowState> {
    public state = { showTooltip: false };
    private spanRef = React.createRef<HTMLElement>();

    checkForEllipsis = () => {
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

    onContext = (e: React.MouseEvent) => {
        const { onContext } = this.props;

        onContext && onContext(this.props.parentList.props.traces[this.props.virtualizedRow.index], e);
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
                onContextMenu={this.onContext}
            >
                <OverlayTrigger
                    trigger={showTooltip ? [ 'focus', 'hover' ] : []}
                    placement='right'
                    container={document.getElementById('context-menu')}
                    overlay={<Tooltip id={`trace-row-tooltip-${ldevId}`}>{rowTitle}</Tooltip>}
                >
                    <div className="trace-row-inner">
                        <span className='btn-select mr-1 trace-checkbox' style={{color}}>
                            <FontAwesomeIcon icon={isActive ? faCheckSquare : faSquare} />
                        </span>
                        <span className='trace-color-indicator' style={{backgroundColor: color}}></span>
                        <span className='trace-row-title' ref={this.spanRef}>{rowTitle}</span>
                        { hasMap && (<button className='btn ldev btn-sm' data-trace={trace.id} onClick={parentList.onLdevClick}><FontAwesomeIcon icon={faSitemap} /></button>) }
                    </div>
                </OverlayTrigger>
            </li>
        );
    }
}

export default connect(storeProps, dispatchProps)(TraceList);
