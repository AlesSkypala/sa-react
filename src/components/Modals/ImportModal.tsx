
import * as React from 'react';
import { Button, Col, ModalTitle, Row, Form } from 'react-bootstrap';
import { ModalComponent } from '.';
import { DataService, Deserialization } from '../../services';
import { default as moment } from 'moment';
import SourceTree from '../SourceTree';
import DateTimeRange from '../DateTimeRange';

const dateFormat = 'HH:mm DD.MM.YYYY';

class InfoModal
extends ModalComponent<ImportResult, Args, State> {
    public state: State = {
        title: 'Nový graf',
        xLabel: 'osa x',
        yLabel: 'osa y',

        startDate: new Date(),
        endDate: new Date(),

        minDate: new Date(),
        maxDate: new Date(),

        selected: [],
    };

    public componentDidMount() {
        DataService.getSources().then(this.loadTraces);
    }

    private sourceMap: { [key: string]: Dataset } = {};
    private loadTraces = (sources: DataSource[]) => {
        this.sourceMap = {};
        sources.forEach(s => s.datasets.forEach(d => {
            this.sourceMap[`${s.id}:${d.id}`] = d;
        }))
        this.setState({ sources })
    }

    protected renderHeader(): JSX.Element {
        const { isGraph } = this.props.args;
        return (
            <ModalTitle>{isGraph ? 'Přidat graf' : 'Importovat křivku'}</ModalTitle>
        );
    }

    private onCheck = (selected: DataNodeDescriptor[]) => {
        let additional: Pick<State, 'minDate' | 'maxDate' | 'startDate' | 'endDate'> = {
            minDate: this.state.minDate,
            maxDate: this.state.maxDate,
            startDate: this.state.startDate,
            endDate: this.state.endDate,
        };
        
        if (this.state.selected.length <= 0 && selected.length > 0) {
            const min = Deserialization.parseTimestamp(Math.max(...selected.map(t => this.sourceMap[`${t.dataset.source}:${t.dataset.id}`].availableXRange[0])));
            const max = Deserialization.parseTimestamp(Math.min(...selected.map(t => this.sourceMap[`${t.dataset.source}:${t.dataset.id}`].availableXRange[1])));

            additional = {
                minDate: min,
                maxDate: max,
                startDate: min,
                endDate: max,
            };
        } else if (selected.length <= 0) {
            additional = { maxDate: new Date(), minDate:  new Date(), startDate:  new Date(), endDate:  new Date() };
        }

        this.setState({ ...additional, selected });
    }
    private onFormChange = (e: React.ChangeEvent<HTMLInputElement>) => this.setState({ [e.currentTarget.name]: e.currentTarget.value } as any);
    private onRangeChange = (start: Date, end: Date) => {
        this.setState({ startDate: start, endDate: end });
    }

    protected renderBody(): JSX.Element {
        if (!this.state.sources) {
            return <p className='text-center'>Načítám křivky...</p>;
        }

        const { isGraph } = this.props.args;
        
        return (
            <Row>
                <Col>
                    <SourceTree
                        sources={this.state.sources}
                        onChange={this.onCheck}
                    />
                </Col>
            {isGraph ? (
                <Col>
                    <Form.Group>
                        <Form.Label>Název grafu</Form.Label>
                        <Form.Control name='title' value={this.state.title} onChange={this.onFormChange}></Form.Control>
                    </Form.Group>
                    <Form.Group>
                        <Form.Label>Popis osy x</Form.Label>
                        <Form.Control name='xLabel' value={this.state.xLabel} onChange={this.onFormChange}></Form.Control>
                    </Form.Group>
                    <Form.Group>
                        <Form.Label>Popis osy y</Form.Label>
                        <Form.Control name='yLabel' value={this.state.yLabel} onChange={this.onFormChange}></Form.Control>
                    </Form.Group>
                    <Form.Group>
                        <Form.Label>Rozmezí</Form.Label>
                        <Form.Control name='timeRange' readOnly autoComplete='off' value={`${moment(this.state.startDate).format(dateFormat)} - ${moment(this.state.endDate).format(dateFormat)}`}></Form.Control>
                        <DateTimeRange
                            minDate={this.state.minDate}
                            maxDate={this.state.maxDate}
                            from={this.state.startDate}
                            to={this.state.endDate}

                            onChange={this.onRangeChange}
                        />
                    </Form.Group>
                </Col>
            ) : undefined}
            </Row>
        );
    }

    private generateTraces = (): Trace[] => this.state.selected.flatMap(s => {
        const dId = `${s.dataset.source}:${s.dataset.id}`;
        const set = this.sourceMap[dId];

        return {
            id: s.dataset.variant ? `${dId}:${s.dataset.variant}` : dId,
            title: s.dataset.variant ? `${set.name} (${s.dataset.variant})` : set.name,
            pipeline: s,
        };
    });

    private okClicked = () => this.resolve(this.props.args.isGraph ? {
        id: 0,

        title: this.state.title,
        xLabel: this.state.xLabel, 
        yLabel: this.state.yLabel,

        xRange: [
            Deserialization.dateToTimestamp(this.state.startDate),
            Deserialization.dateToTimestamp(this.state.endDate)
        ],
        traces: this.generateTraces(),
    } as Graph : this.generateTraces());
    private cancelClicked = () => this.resolve(undefined);

    protected renderFooter(): JSX.Element {
        const { isGraph } = this.props.args;

        return (
            <>
                <Button variant='primary' onClick={this.okClicked} disabled={this.state.selected.length <= 0}>
                {isGraph ? 'Přidat' : 'Importovat'}
                </Button>
                <Button variant='secondary' onClick={this.cancelClicked}>
                Zrušit
                </Button>
            </>
        );
    }
}

export interface Args {
    isGraph: boolean;
}

interface State {
    sources?: DataSource[];
    selected: DataNodeDescriptor[];

    title: Graph['title'],
    xLabel: Graph['xLabel'],
    yLabel: Graph['yLabel'],

    minDate: Date,
    maxDate: Date,

    startDate: Date,
    endDate: Date,
}

export type ImportResult = Graph | Trace[];

export default InfoModal;