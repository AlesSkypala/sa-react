
import * as React from 'react';
import { Button, Col, ModalTitle, Row, Form, Spinner, ButtonGroup, Dropdown } from 'react-bootstrap';
import { ModalComponent } from '.';
import { DataService } from '../../services';
import DataJob from '../../services/DataJob';
import DateTimeRange from '../DateTimeRange';
import { Props } from './ModalComponent';
import { t } from '../../locale';
import { generate_graph_id } from '../../redux';
import { dateToTimestamp, getDayFromEnd, rangeIntersectsBounds } from '../../utils/datetime';
import DatasetTree from '../DatasetTree';

import './AddGraphModal.css';

let PREV_SOURCE: DataSource['id'] | undefined = undefined;
let PREV_TIMERANGE: Graph['xRange'] | undefined = undefined;

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
            this.setState({
                sources,
                selectedSource: sources.find(s => s.id === PREV_SOURCE),
                selectedRange: PREV_TIMERANGE
            });
        });
    }

    getTitle = (sourceType: DataSource['type'], id: Trace['id']) => {
        if (sourceType === 'hp') {
            let match;

            if ((match = id.match(/([\w_]+_MPU)-(\d+)$/))) {
                return t(`datasets.titles.hp.${match[1]}`, id, { val: match[2] });
            }
        }

        return t(`datasets.titles.${sourceType}.${id}`, id);
    }

    getDescription = (sourceType: DataSource['type'], id: Trace['id']) => {
        const result = t(`datasets.descriptions.${sourceType}.${id}`, '');

        if (result !== '')
            return result;
        else
            return undefined;
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
            this.setState({ selectedDatasets: this.state.selectedSource.datasets.filter(ds => val.includes(ds.id)) });
        }
    }

    singleClicked = () => {
        const datasets = this.state.selectedDatasets;
        if (!datasets || datasets.length <= 0) return;
        if (this.state.selectedRange === undefined) throw new Error('Unexpected error: No range selected when creating a graph.');
        if (this.state.selectedSource === undefined) throw new Error('Unexpected error: No source selected when creating a graph.');

        const xRange = [...this.state.selectedRange] as Graph['xRange'];
        const id = generate_graph_id();

        const sourceType = this.state.selectedSource.type;
        const sourceName = this.state.selectedSource.name;

        // TODO convert units if possible
        const units = new Set<string>();
        datasets.forEach( d => units.add(d.units) );

        const graph: Graph = {
            id,

            title:  t('graph.new'),
            xLabel: t('graph.xAxis'),
            yLabel: t('graph.yAxis'),

            // !
            // TODO: this must be reworked to take into account the real xtype of selected traces
            xType: 'datetime',

            style: {
                margin: 5,
                xLabelSpace: 24,
                yLabelSpace: 60,
            },

            metadata: {
                sourceNames: [ sourceName ],
                datasetNames: datasets.map( d => this.getTitle(sourceType, d.id) ),
                units: [...units],
            },

            xRange,
            traces: [],
        };

        const job = new DataJob(xRange).relate(id);
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
            const id = generate_graph_id();

            const datasetName = this.getTitle(sourceType, dataset.id);
            const title = `${datasetName} [${dataset.units === 'percent' ? '%' : dataset.units}]`;

            graphs.push({
                id, title,

                xLabel: t('graph.xAxis'),
                yLabel: t('graph.yAxis'),

                // !
                // TODO: this must be reworked to take into account the real xtype of selected traces
                xType: 'datetime',

                metadata: {
                    sourceNames: [ sourceName ],
                    datasetNames: [ datasetName ],
                    units: [ dataset.units ],
                },

                style: {
                    margin: 5,
                    xLabelSpace: 24,
                    yLabelSpace: 60,
                },

                xRange,
                traces: [],
            });

            jobs.push(new DataJob(xRange).downloadBulk({ source: dataset.source, id: dataset.id }).relate(id));
        });

        this.props.onAddGraphs && this.props.onAddGraphs([ graphs, jobs ]);
        this.props.onClose([ graphs, jobs ]);
    }

    onSetQuick = (sid: Dataset['id']) => {
        const datasets = this.state.selectedSource ? [ this.state.selectedSource.datasets.find(s => s.id === sid) as Dataset ] : undefined;
        if (!datasets || datasets.length <= 0 || !datasets[0]) return;
        if (this.state.selectedRange === undefined) throw new Error('Unexpected error: No range selected when creating a graph.');
        if (this.state.selectedSource === undefined) throw new Error('Unexpected error: No source selected when creating a graph.');

        const xRange = [...this.state.selectedRange] as Graph['xRange'];
        const id = generate_graph_id();

        const sourceType = this.state.selectedSource.type;
        const sourceName = this.state.selectedSource.name;

        // TODO convert units if possible
        const units = new Set<string>();
        datasets.forEach( d => units.add(d.units) );

        const graph: Graph = {
            id,

            title:  t('graph.new'),
            xLabel: t('graph.xAxis'),
            yLabel: t('graph.yAxis'),

            // !
            // TODO: this must be reworked to take into account the real xtype of selected traces
            xType: 'datetime',

            style: {
                margin: 5,
                xLabelSpace: 24,
                yLabelSpace: 60,
            },

            metadata: {
                sourceNames: [ sourceName ],
                datasetNames: datasets.map( d => this.getTitle(sourceType, d.id) ),
                units: [...units],
            },

            xRange,
            traces: [],
        };

        const job = new DataJob(xRange).relate(id);
        datasets.forEach( t => job.downloadBulk({ source: t.source, id: t.id }) );
        this.props.onAddGraphs && this.props.onAddGraphs([ [ graph ], [ job ] ]);
    }

    cancelClicked = (e: React.MouseEvent) => { e.preventDefault(); this.resolve(undefined); }

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
        const availableRange = selectedSource?.datasets[0].dataRange;

        return (
            <Form>
                <Row className='separated'>
                    <Form.Group as={Col} className='d-flex flex-column'>
                        <Form.Label>{t('modals.addGraph.source')}</Form.Label>
                        <Form.Control as='select' multiple onChange={this.onSourceSelected} value={[this.state.selectedSource?.id ?? '']} className='h-100'>
                            {this.state.sources.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </Form.Control>
                    </Form.Group>
                    <Form.Group as={Col} className='d-flex flex-column'>
                        <Form.Label>{t('modals.addGraph.range')}</Form.Label>
                        <DateTimeRange
                            bounds={availableRange ?? defaultRange}
                            value={selectedRange}

                            disabled={timeDisabled}
                            onChange={this.onRangeChange}
                        />
                    </Form.Group>
                    <Form.Group as={Col} className='d-flex flex-column' style={{ overflowX: 'hidden', flexBasis: 0 }}>
                        <Form.Label>{t('modals.addGraph.datasets')}</Form.Label>
                        {selectedSource &&
                            <DatasetTree
                                disabled={setsDisabled}
                                source={selectedSource}
                                selected={(selectedDatasets ?? []).map(ds => ds.id)}
                                
                                onChange={this.onSetSelected}
                                onDoubleClick={this.onSetQuick}
                            />}
                    </Form.Group>
                    <Form.Group as={Col} className='d-flex flex-column'>
                        <Form.Label className='mt-3'>{t('modals.addGraph.description')}</Form.Label>
                        <div style={{ flexBasis: 0, flexGrow: 1, overflowY: 'scroll' }}>
                            {selectedSource && selectedDatasets?.map(t => [ t.id, this.getDescription(selectedSource.type, t.id) ]).filter(t => t[1]).map(t => (
                                <Form.Text key={t[0]}>{t[1]}</Form.Text>
                            ))}
                        </div>
                    </Form.Group>
                </Row>
            </Form>
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