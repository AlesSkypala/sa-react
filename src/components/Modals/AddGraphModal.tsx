
import * as React from 'react';
import { Button, Col, ModalTitle, Row, Form, Spinner, ButtonGroup } from 'react-bootstrap';
import { ModalComponent } from '.';
import { DataService, Deserialization } from '../../services';
import { default as moment } from 'moment';
import DateTimeRange from '../DateTimeRange';
import { Props } from './ModalComponent';

import './AddGraphModal.css';

const dateFormat = 'HH:mm DD.MM.YYYY';

class InfoModal
    extends ModalComponent<ImportResult, Args, State> {
    public state: State = {
        title: 'Nový graf',
        xLabel: 'osa x',
        yLabel: 'osa y',
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
            <ModalTitle>Přidat graf</ModalTitle>
        );
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
                    selectedSource.datasets.reduce((val, set) => Math.max(set.availableXRange[0] as number, val), 0) as XTypeTypeMap[XType],
                    selectedSource.datasets.reduce((val, set) => Math.max(set.availableXRange[1] as number, val), 0) as XTypeTypeMap[XType],
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

        this.setState({
            selectedRange: [
                Math.max(
                    (this.state.availableRange[1] as number) - parseInt(e.currentTarget.dataset.range ?? '0'),
                    this.state.availableRange[0] as number
                ),
                this.state.availableRange[1]
            ]
        });
    };
    getRangeString = () => {
        if (!this.state.selectedRange) return 'Nezvoleno';

        const [from, to] = this.state.selectedRange as [number, number];

        return `${moment(Deserialization.parseTimestamp(from)).format(dateFormat)} - ${moment(Deserialization.parseTimestamp(to)).format(dateFormat)}`;
    }

    protected renderBody(): JSX.Element {
        if (!this.state.sources) {
            return (
                <>
                    <p className='text-center'>Načítám křivky...</p>
                    <div className='text-center my-3'><Spinner animation='border' variant='primary' /></div>
                </>
            );
        }

        const { availableRange, selectedRange, selectedSource, selectedTraces } = this.state;
        const timeDisabled = !this.state.selectedSource;
        const setsDisabled = !this.state.selectedRange;
        const now = new Date();
        const defaultRange: [Date,Date] = [ now, now ];

        return (
            <Form>
                <Row className='separated'>
                    <Form.Group as={Col} className='d-flex flex-column'>
                        <Form.Label>Zdroj dat</Form.Label>
                        <Form.Control as='select' multiple onChange={this.onSourceSelected} value={[this.state.selectedSource?.id ?? '']} className='h-100'>
                            {this.state.sources.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </Form.Control>
                    </Form.Group>
                    <Form.Group as={Col} className='d-flex flex-column'>
                        <Form.Label>Rozmezí</Form.Label>
                        <Form.Control name='timeRange' readOnly autoComplete='off' value={this.getRangeString()}></Form.Control>
                        <ButtonGroup className='my-2'>
                            <Button disabled={timeDisabled} onClick={this.onRangeButton} data-range={24 * 3600}>Den</Button>
                            <Button disabled={timeDisabled} onClick={this.onRangeButton} data-range={7 * 24 * 3600}>Týden</Button>
                            <Button disabled={timeDisabled} onClick={this.onRangeButton} data-range={4 * 7 * 24 * 3600}>Měsíc</Button>
                        </ButtonGroup>
                        <DateTimeRange
                            bounds={(availableRange?.map(v => Deserialization.parseTimestamp(v as number)) as ([Date, Date] | undefined)) ?? defaultRange}
                            value={selectedRange?.map(v => Deserialization.parseTimestamp(v as number)) as ([Date, Date] | undefined)}

                            disabled={timeDisabled}
                            onChange={this.onRangeChange}
                        />
                    </Form.Group>
                    <Form.Group as={Col} className='d-flex flex-column'>
                        <Form.Label>Datasety</Form.Label>
                        <Form.Control as='select' multiple onChange={this.onSetSelected} disabled={setsDisabled} className='h-100' >
                            {selectedSource && (selectedRange ? selectedSource.datasets.filter(ds => ds.availableXRange[1] as number > selectedRange[0] && ds.availableXRange[0] as number < selectedRange[1]) : selectedSource.datasets).map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </Form.Control>
                    </Form.Group>
                    <Col>
                        <Form.Group>
                            <Form.Label>Počet křivek</Form.Label>
                            <Form.Control readOnly value={selectedTraces?.reduce((val, set) => val + set.variantCount, 0) ?? 0} />
                        </Form.Group>
                    </Col>
                </Row>
            </Form>
        );
    }

    private generateTraces = async (dataset: Dataset): Promise<Trace[]> => {
        if (dataset.variantCount <= 1) {
            return [
                {
                    id: `${dataset.source}:${dataset.id}`,
                    title: dataset.name,
                    pipeline: {
                        type: 'data',
                        dataset: {
                            source: dataset.source,
                            id: dataset.id,
                        }
                    },
                }
            ];
        }

        const variants: string[] = await DataService.getTraceVariants(dataset);

        return variants.map(v => (
            {
                id: `${dataset.source}:${dataset.id}:${v}`,
                title: v,
                pipeline: {
                    type: 'data',
                    dataset: {
                        source: dataset.source,
                        id: dataset.id,
                        variant: v,
                    }
                },
            }
        ));
    }

    private singleClicked = async () => {
        if (!this.state.selectedTraces || this.state.selectedTraces.length <= 0) return;

        const traces = (await Promise.all(this.state.selectedTraces.map(this.generateTraces))).flatMap(t => t);

        const graph: Graph = {
            id: 0,

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

            xRange: [...(this.state.selectedRange as Graph['xRange'])],
            traces,
            activeTraces: traces.map(t => t.id)
        };

        this.props.onClose([ graph ]);
    }

    private multiClicked = async () => {
        if (!this.state.selectedTraces || this.state.selectedTraces.length <= 0) return;

        const graphs = this.state.selectedTraces.map(async (dataset): Promise<Graph> => {
            const traces = await this.generateTraces(dataset);
            
            return {
                id: 0,

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

                xRange: [...(this.state.selectedRange as Graph['xRange'])],
                traces,
                activeTraces: traces.map(t => t.id)
            };
        });

        this.props.onClose(await Promise.all(graphs));
    }

    private cancelClicked = (e: React.MouseEvent) => { e.preventDefault(); this.resolve(undefined); }

    protected renderFooter(): JSX.Element {
        const { selectedTraces } = this.state;

        return (
            <>
                <Button variant='primary' onClick={this.multiClicked} disabled={!selectedTraces || selectedTraces.length < 2}>
                    Přidat zvlášť
                </Button>
                <Button variant='primary' onClick={this.singleClicked} disabled={!selectedTraces || selectedTraces.length < 1}>
                    Přidat
                </Button>
                <Button variant='secondary' onClick={this.cancelClicked}>
                    Zrušit
                </Button>
            </>
        );
    }
}

export interface Args {

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

export type ImportResult = Graph[];

export default InfoModal;