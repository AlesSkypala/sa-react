
import * as React from 'react';
import { Button, Col, ModalTitle, Row, Form, Spinner, ButtonGroup, Dropdown } from 'react-bootstrap';
import { ModalComponent } from '.';
import { DataService } from '../../services';
import DataJob from '../../services/DataJob';
import DateTimeRange from '../DateTimeRange';
import { Props } from './ModalComponent';
import { t } from '../../locale';
import { dateToTimestamp, getDayFromEnd, rangeIntersectsBounds } from '../../utils/datetime';
import DatasetTree from '../DatasetTree';
import * as GraphUtils from '../../utils/graph';

import './AddGraphModal.scss';

let PREV_SOURCE: DataSource['id'] | undefined = undefined;
let PREV_TIMERANGE: Graph['xRange'] | undefined = undefined;
let PREV_DATASETS: Dataset['id'][] | undefined = undefined;

export interface Args {
    ranges: Graph['xRange'][];
    onAddGraphs?(result: ImportResult): void;
}

interface State {
    sources?: DataSource[];

    selectedSource?: DataSource;
    selectedDatasets?: Dataset[];
    selectedRange?:  Graph['xRange'],
}

export type ImportResult = [ Graph[], DataJob[] ];

class AddGraphModal extends ModalComponent<ImportResult, Args, State> {
    public state: State = {};

    constructor(props: Props<ImportResult, Args> | Readonly<Props<ImportResult, Args>>) {
        super(props);
        this.size = 'xl';
    }

    public componentDidMount(): void {
        DataService.getSources().then((sources: DataSource[]) => {
            const prevSource = sources.find(s => s.id === PREV_SOURCE);
            this.setState({
                sources,
                selectedSource: prevSource,
                selectedRange: PREV_TIMERANGE,
                selectedDatasets: prevSource && PREV_DATASETS ? prevSource.datasets.filter(d => PREV_DATASETS?.includes(d.id)) : undefined,
            });
        });
    }

    onRangeChange = (range: Graph['xRange']) => {
        PREV_TIMERANGE = range;
        this.setState({ selectedRange: range });
    }

    onSourceSelected = (e: React.ChangeEvent<HTMLSelectElement>) => {
        e.preventDefault();
        const selectedSource = this.state.sources?.find(s => s.id === e.currentTarget.value);

        if (selectedSource !== this.state.selectedSource) {
            PREV_SOURCE = selectedSource?.id;
            let selectedRange = this.state.selectedRange;

            if (selectedSource?.datasets.length) {
                const dataRange = selectedSource.datasets[0].dataRange as [number, number][];
                const lastRange = dataRange[dataRange.length - 1];

                PREV_TIMERANGE = selectedRange = !selectedRange || !rangeIntersectsBounds(selectedRange, dataRange) ? getDayFromEnd(lastRange, 0) : selectedRange;
            }

            this.setState({
                selectedRange,
                selectedSource,
                selectedDatasets: undefined
            });
        }
    }

    onSetSelected = (val: Dataset['id'][]) => {
        if (this.state.selectedSource) {
            const selected = this.state.selectedSource.datasets.filter(ds => val.includes(ds.id));
            PREV_DATASETS = selected.map(d => d.id);
            this.setState({ selectedDatasets: selected });
        }
    }

    singleClicked = () => {
        const datasets = this.state.selectedDatasets;
        if (!datasets || datasets.length <= 0) return;
        if (this.state.selectedRange === undefined) throw new Error('Unexpected error: No range selected when creating a graph.');
        if (this.state.selectedSource === undefined) throw new Error('Unexpected error: No source selected when creating a graph.');

        const xRange = [...this.state.selectedRange] as Graph['xRange'];

        const sourceType = this.state.selectedSource.type;
        const sourceName = this.state.selectedSource.name;

        // TODO convert units if possible
        const units = new Set<string>();
        datasets.forEach( d => units.add(d.units) );

        const graph: Graph = GraphUtils.createGraph({
            // !
            // TODO: this must be reworked to take into account the real xtype of selected traces
            xType: 'datetime',
            xRange,

            metadata: {
                sourceNames: [ sourceName ],
                datasetNames: datasets.map( d => GraphUtils.getTitle(sourceType, d.id) ),
                units: [...units],
            },
        });

        const job = new DataJob(xRange).relate(graph.id);
        datasets.forEach( t => job.downloadBulk({ source: t.source, id: t.id }) );
        this.props.onAddGraphs && this.props.onAddGraphs([ [ graph ], [ job ] ]);
        this.props.onClose([ [ graph ], [ job ] ]);
    }

    multiClicked = () => {
        if (!this.state.selectedDatasets || this.state.selectedDatasets.length <= 0) return;
        if (this.state.selectedRange === undefined)  throw new Error('Unexpected error: No range selected when creating a graph.');
        if (this.state.selectedSource === undefined) throw new Error('Unexpected error: No source selected when creating a graph.');

        const graphs: Graph[] = [];
        const jobs: DataJob[] = [];

        const xRange = [...this.state.selectedRange] as Graph['xRange'];

        const sourceType = this.state.selectedSource.type;
        const sourceName = this.state.selectedSource.name;

        this.state.selectedDatasets.forEach(dataset => {
            const datasetName = GraphUtils.getTitle(sourceType, dataset.id);
            const title = `${datasetName} [${dataset.units === 'percent' ? '%' : dataset.units}]`;
            let graph;

            graphs.push(graph = GraphUtils.createGraph({
                title,

                // TODO: this must be reworked to take into account the real xtype of selected traces
                xType: 'datetime',
                xRange,

                metadata: {
                    sourceNames: [ sourceName ],
                    datasetNames: [ datasetName ],
                    units: [ dataset.units ],
                },
            }));

            jobs.push(new DataJob(xRange).downloadBulk({ source: dataset.source, id: dataset.id }).relate(graph.id));
        });

        this.props.onAddGraphs && this.props.onAddGraphs([ graphs, jobs ]);
        this.props.onClose([ graphs, jobs ]);
    }

    onSetQuick = (sid: Dataset['id']) => {
        if (this.state.selectedRange === undefined) throw new Error('Unexpected error: No range selected when creating a graph.');
        if (this.state.selectedSource === undefined) throw new Error('Unexpected error: No source selected when creating a graph.');

        const dataset = this.state.selectedSource.datasets.find(s => s.id === sid);
        if (!dataset) return;

        const xRange = [...this.state.selectedRange] as Graph['xRange'];

        const sourceType = this.state.selectedSource.type;
        const sourceName = this.state.selectedSource.name;

        const datasetName = GraphUtils.getTitle(sourceType, dataset.id);
        const title = `${datasetName} [${dataset.units === 'percent' ? '%' : dataset.units}]`;

        const graph: Graph = GraphUtils.createGraph({
            title,

            // TODO: this must be reworked to take into account the real xtype of selected traces
            xType: 'datetime',
            xRange,

            metadata: {
                sourceNames: [ sourceName ],
                datasetNames: [ GraphUtils.getTitle(sourceType, dataset.id) ],
                units: [ dataset.units ],
            },
        });

        const job = new DataJob(xRange).relate(graph.id);
        job.downloadBulk({ source: dataset.source, id: dataset.id });
        this.props.onAddGraphs && this.props.onAddGraphs([ [ graph ], [ job ] ]);
    }

    cancelClicked = (e: React.MouseEvent) => { e.preventDefault(); this.resolve(undefined); }

    generateSourceTooltip = (source: DataSource) => {
        let tooltip = source.name + '\n\n';

        tooltip += t('datasets.id', { id: source.id }) + '\n';

        if ('path' in source.metadata) {
            tooltip += t('datasets.path', { path: source.metadata['path'].replaceAll('/', '\\') }) + '\n';
        }

        return tooltip.trimEnd();
    }

    protected renderHeader(): JSX.Element {
        return (
            <ModalTitle>{t('modals.addGraph.title')}</ModalTitle>
        );
    }

    protected renderBody(): JSX.Element {
        if (!this.state.sources) {
            return (
                <>
                    <p className='text-center'>{t('modals.addGraph.loading')}...</p>
                    <div className='text-center my-3'><Spinner animation='border' variant='primary' /></div>
                </>
            );
        }

        const { selectedRange, selectedSource, selectedDatasets } = this.state;
        const timeDisabled = !selectedSource;
        const setsDisabled = !selectedRange;
        const now = new Date();
        const defaultRange: Dataset['dataRange'] = [ [ dateToTimestamp(now), dateToTimestamp(now) ] ];
        const availableRange = selectedSource?.dataranges;

        console.log(availableRange);

        return (
            <Row className='separated'>
                <Form.Group as={Col} md={3} className='d-flex flex-column'>
                    <Form.Label>{t('modals.addGraph.source')}</Form.Label>
                    <Form.Control as='select' multiple onChange={this.onSourceSelected} value={[this.state.selectedSource?.id ?? '']} className='h-100' id='source-select'>
                        {this.state.sources.map(s => (
                            <option disabled={s.datasets.length <= 0} key={s.id} value={s.id} title={this.generateSourceTooltip(s)}>{s.name}</option>
                        ))}
                    </Form.Control>
                    <small className='mt-2'>{t('datasets.path', { path: selectedSource && 'path' in selectedSource.metadata ? selectedSource.metadata['path'].replaceAll('/', '\\') : 'none' })}</small>
                </Form.Group>
                <Form.Group as={Col} md={5} className='d-flex flex-column'>
                    <Form.Label>{t('modals.addGraph.range')}</Form.Label>
                    <DateTimeRange
                        bounds={availableRange ?? defaultRange}
                        value={selectedRange}

                        disabled={timeDisabled}
                        onChange={this.onRangeChange}
                    />
                </Form.Group>
                <Form.Group as={Col} md={4} className='d-flex flex-column'>
                    <Form.Label>{t('modals.addGraph.datasets')}</Form.Label>
                    {selectedSource &&
                        <DatasetTree
                            disabled={setsDisabled}
                            source={selectedSource}
                            dataRange={selectedRange ?? [0, 0]}
                            selected={(selectedDatasets ?? []).map(ds => ds.id)}

                            storeId='add-graph-tree'
                            onChange={this.onSetSelected}
                            onDoubleClick={this.onSetQuick}
                        />}
                </Form.Group>
            </Row>
        );
    }

    protected renderFooter(): JSX.Element {
        const { selectedDatasets } = this.state;
        const addDisabled = !selectedDatasets || selectedDatasets.length < 1;

        return (
            <>
                <div style={{ marginRight: 'auto' }}>
                    {t('modals.addGraph.traceCount', { count: selectedDatasets?.reduce((val, set) => val + set.variantCount, 0) ?? 0 })}
                </div>
                <Dropdown as={ButtonGroup}>
                    <Button variant='primary' onClick={this.multiClicked} disabled={addDisabled}>
                        {t('modals.add')}
                    </Button>
                    <Dropdown.Toggle split variant='primary' disabled={addDisabled} />
                    <Dropdown.Menu>
                        <Dropdown.Item onClick={this.singleClicked}>{t('modals.addGraph.singleGraph')}</Dropdown.Item>
                    </Dropdown.Menu>
                </Dropdown>
                <Button variant='secondary' onClick={this.cancelClicked}>
                    {t('modals.cancel')}
                </Button>
            </>
        );
    }
}

export default AddGraphModal;