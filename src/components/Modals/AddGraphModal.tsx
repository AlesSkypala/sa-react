
import * as React from 'react';
import { Button, Col, ModalTitle, Row, Form, Spinner, ButtonGroup, Dropdown } from 'react-bootstrap';
import { ModalComponent } from '.';
import { DataService, Deserialization } from '../../services';
import DataJob from '../../services/DataJob';
import { default as moment } from 'moment';
import DateTimeRange from '../DateTimeRange';
import { Props } from './ModalComponent';

import './AddGraphModal.css';
import { t } from '../../locale';
import { generate_graph_id } from '../../redux';

const dateFormat = 'HH:mm DD.MM.YYYY';

class InfoModal
    extends ModalComponent<ImportResult, Args, State> {
    public state: State = {
        title: t('graph.new'),
        xLabel: t('graph.xAxis'),
        yLabel: t('graph.yAxis'),
    };

    constructor(props: Props<ImportResult, Args> | Readonly<Props<ImportResult, Args>>) {
        super(props);
        this.size = 'xl';
    }

    public componentDidMount(): void {
        DataService.getSources().then(this.loadTraces);
    }

    private sourceMap: { [key: string]: Dataset } = {};
    private loadTraces = (sources: DataSource[]) => {
        this.sourceMap = {};
        sources.forEach(s => s.datasets.forEach(d => {
            this.sourceMap[`${s.id}:${d.id}`] = d;
        }));
        this.setState({ sources });
    }

    protected renderHeader(): JSX.Element {
        return (
            <ModalTitle>{t('modals.addGraph.title')}</ModalTitle>
        );
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

    // private onFormChange = (e: React.ChangeEvent<HTMLInputElement>) => this.setState({ [e.currentTarget.name]: e.currentTarget.value } as never);
    private onRangeChange = (start: Date, end: Date) => {
        if (this.state.selectedSource) {
            this.setState({
                selectedRange: [
                    Deserialization.dateToTimestamp(start) as XTypeTypeMap[XType],
                    Deserialization.dateToTimestamp(end) as XTypeTypeMap[XType],
                ]
            });
        }
    }

    onSourceSelected = (e: React.ChangeEvent<HTMLSelectElement>) => {
        e.preventDefault();
        const selectedSource = this.state.sources?.find(s => s.id === e.currentTarget.value);

        if (selectedSource !== this.state.selectedSource) {
            const additional: Pick<State, 'availableRange' | 'selectedRange'> = { availableRange: undefined, selectedRange: undefined };

            if (selectedSource) {
                additional.availableRange = [
                    selectedSource.datasets.reduce((val, set) => Math.max(set.dataRange[0][0] as number, val), 0) as XTypeTypeMap[XType],
                    selectedSource.datasets.reduce((val, set) => Math.max(set.dataRange[set.dataRange.length - 1][1] as number, val), 0) as XTypeTypeMap[XType],
                ];
            }

            this.setState({ ...additional, selectedSource, selectedTraces: undefined });
        }
    }

    onSetSelected = (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (this.state.selectedSource) {
            const selected = Array.from(e.currentTarget.selectedOptions, i => this.state.selectedSource?.datasets.find(ds => ds.id === i.value)).filter(v => !!v) as Dataset[];
            this.setState({ selectedTraces: selected });
        }
    }

    onRangeButton = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (!this.state.availableRange) return;

        const { from, to, range } = e.currentTarget.dataset;

        if (from && to) {
            this.setState({
                selectedRange: [
                    parseInt(from),
                    parseInt(to),
                ]
            });
        } else if (range) {
            this.setState({
                selectedRange: [
                    Math.max(
                        (this.state.availableRange[1] as number) - parseInt(range),
                        this.state.availableRange[0] as number
                    ),
                    this.state.availableRange[1]
                ]
            });
        }
    };
    getRangeString = () => {
        if (!this.state.selectedRange) return t('modals.addGraph.noRange');

        const [from, to] = this.state.selectedRange as [number, number];

        return `${moment(Deserialization.parseTimestamp(from)).format(dateFormat)} - ${moment(Deserialization.parseTimestamp(to)).format(dateFormat)}`;
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

        const { availableRange, selectedRange, selectedSource, selectedTraces } = this.state;
        const timeDisabled = !selectedSource;
        const setsDisabled = !selectedRange;
        const now = new Date();
        const defaultRange: [Date,Date] = [ now, now ];
        const existingRanges = this.props.ranges; // this.props.existingGraphs ?? [];

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
                        <Form.Control name='timeRange' readOnly autoComplete='off' value={this.getRangeString()}></Form.Control>
                        <Dropdown as={ButtonGroup} className='my-2'>
                            <Button disabled={timeDisabled} onClick={this.onRangeButton} data-range={24 * 3600}>{t('modals.addGraph.day')}</Button>
                            <Button disabled={timeDisabled} onClick={this.onRangeButton} data-range={7 * 24 * 3600}>{t('modals.addGraph.week')}</Button>
                            <Button disabled={timeDisabled} onClick={this.onRangeButton} data-range={4 * 7 * 24 * 3600}>{t('modals.addGraph.month')}</Button>
                            
                            <Dropdown.Toggle disabled={timeDisabled} />
                            <Dropdown.Menu>
                                <Dropdown.Item onClick={this.onRangeButton} data-range={91 * 24 * 3600}>{t('modals.addGraph.quarter')}</Dropdown.Item>
                                <Dropdown.Item onClick={this.onRangeButton} data-range={183 * 24 * 3600}>{t('modals.addGraph.halfYear')}</Dropdown.Item>
                                <Dropdown.Item onClick={this.onRangeButton} data-range={365 * 24 * 3600}>{t('modals.addGraph.year')}</Dropdown.Item>
                                {existingRanges.length > 0 && (
                                    <>
                                        <Dropdown.Divider />
                                        <Dropdown.ItemText>{t('modals.addGraph.copy')}</Dropdown.ItemText>
                                        {existingRanges.map((val, idx) => (
                                            <Dropdown.Item key={idx} data-from={val[0]} data-to={val[1]} onClick={this.onRangeButton}>{idx}</Dropdown.Item>
                                        ))}
                                    </>
                                )}
                            </Dropdown.Menu>
                        </Dropdown>
                        <DateTimeRange
                            bounds={(availableRange?.map(v => Deserialization.parseTimestamp(v as number)) as ([Date, Date] | undefined)) ?? defaultRange}
                            value={selectedRange?.map(v => Deserialization.parseTimestamp(v as number)) as ([Date, Date] | undefined)}

                            disabled={timeDisabled}
                            onChange={this.onRangeChange}
                        />
                    </Form.Group>
                    <Form.Group as={Col} className='d-flex flex-column'>
                        <Form.Label>{t('modals.addGraph.datasets')}</Form.Label>
                        <Form.Control as='select' multiple onChange={this.onSetSelected} disabled={setsDisabled} className='h-100' >
                            {selectedSource && (selectedRange ? selectedSource.datasets.filter(ds => ds.dataRange[ds.dataRange.length - 1][1] as number > selectedRange[0] && ds.dataRange[0][0] as number < selectedRange[1]) : selectedSource.datasets).map(s => (
                                <option key={s.id} value={s.id}>{this.getTitle(selectedSource.type, s.id)}</option>
                            ))}
                        </Form.Control>
                    </Form.Group>
                    <Col>
                        <Form.Group>
                            <Form.Label>{t('modals.addGraph.traceCount')}</Form.Label>
                            <Form.Control readOnly value={selectedTraces?.reduce((val, set) => val + set.variantCount, 0) ?? 0} />
                        </Form.Group>
                        <Form.Group>
                            <Form.Label>{t('modals.addGraph.description')}</Form.Label>
                            {selectedSource && selectedTraces?.map(t => [ t.id, this.getDescription(selectedSource.type, t.id) ]).filter(t => t[1]).map(t => (
                                <Form.Text key={t[0]}>{t[1]}</Form.Text>
                            ))}
                        </Form.Group>
                    </Col>
                </Row>
            </Form>
        );
    }

    // private generateTraces = async (dataset: Dataset): Promise<Trace[]> => {
    //     if (dataset.variantCount <= 1) {
    //         return [
    //             {
    //                 id: `${dataset.source}:${dataset.id}`,

    //                 title: this.getTitle(this.state.selectedSource?.type ?? '', dataset.id),
    //                 pipeline: {
    //                     type: 'data',
    //                     dataset: {
    //                         source: dataset.source,
    //                         id: dataset.id,
    //                     }
    //                 },
    //             }
    //         ];
    //     }

    //     const variants: string[] = await DataService.getTraceVariants(dataset);

    //     return variants.map(v => (
    //         { 
    //             id: `${dataset.source}:${dataset.id}:${v}`,
    //             title: v,
    //             pipeline: {
    //                 type: 'data',
    //                 dataset: {
    //                     source: dataset.source,
    //                     id: dataset.id,
    //                     variant: v,
    //                 }
    //             },
    //         }
    //     ));
    // }

    private singleClicked = () => {
        if (!this.state.selectedTraces || this.state.selectedTraces.length <= 0) return;

        const xRange = [...(this.state.selectedRange as number[])] as Graph['xRange'];
        const id = generate_graph_id();

        const graph: Graph = {
            id,

            title:  this.state.title,
            xLabel: this.state.xLabel,
            yLabel: this.state.yLabel,

            // !
            // TODO: this must be reworked to take into account the real xtype of selected traces
            xType: 'datetime',

            style: {
                margin: 5,
                xLabelSpace: 24,
                yLabelSpace: 60,
            },

            xRange,
            traces: [],
            activeTraces: [],
        };

        this.props.onClose([ [ graph ],
            [
                this.state.selectedTraces.reduce((job, t) => job.downloadBulk({ source: t.source, id: t.id }).relate(id), new DataJob(xRange))
            ]
        ]);
    }

    private multiClicked = () => {
        if (!this.state.selectedTraces || this.state.selectedTraces.length <= 0) return;

        const graphs: Graph[] = [];
        const jobs: DataJob[] = [];

        this.state.selectedTraces.forEach(t => {
            const xRange = [...(this.state.selectedRange as number[])] as Graph['xRange'];
            const id = generate_graph_id();

            graphs.push({
                id,

                title:  this.state.title,
                xLabel: this.state.xLabel,
                yLabel: this.state.yLabel,

                // !
                // TODO: this must be reworked to take into account the real xtype of selected traces
                xType: 'datetime',

                style: {
                    margin: 5,
                    xLabelSpace: 24,
                    yLabelSpace: 60,
                },

                xRange,
                traces: [],
                activeTraces: [],
            });

            jobs.push(new DataJob(xRange).downloadBulk({ source: t.source, id: t.id }).relate(id));
        });

        this.props.onClose([ graphs, jobs ]);
    }

    private cancelClicked = (e: React.MouseEvent) => { e.preventDefault(); this.resolve(undefined); }

    protected renderFooter(): JSX.Element {
        const { selectedTraces } = this.state;
        const addDisabled = !selectedTraces || selectedTraces.length < 1;

        return (
            <>
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

export interface Args {
    ranges: Graph['xRange'][];
}

interface State {
    sources?: DataSource[];

    selectedSource?: DataSource;
    selectedTraces?: Dataset[];

    title: Graph['title'],
    xLabel: Graph['xLabel'],
    yLabel: Graph['yLabel'],

    availableRange?: Graph['xRange'],
    selectedRange?: Graph['xRange'],
}

export type ImportResult = [ Graph[], DataJob[] ];

export default InfoModal;