
import * as React from 'react';
import { Button, Col, ModalTitle, Row, Form } from 'react-bootstrap';
import Tree, { TreeNode } from 'rc-tree';
import { ModalComponent } from '.';
import { DataService } from '../../services';

import 'rc-tree/assets/index.css';

class InfoModal
extends ModalComponent<ImportResult, Args, State> {
    public state: State = {
        title: 'Nový graf',
        xLabel: 'osa x',
        yLabel: 'osa y',

        selected: [],
    };

    constructor(props: any) {
        super(props);

        DataService.getSources().then(this.loadTraces);
    }

    private loadTraces = (sources: DataSource[]) => this.setState({ sources });

    protected renderHeader(): JSX.Element {
        const { isGraph } = this.props.args;
        return (
            <ModalTitle>{isGraph ? 'Přidat graf' : 'Importovat křivku'}</ModalTitle>
        );
    }

    private onCheck = (selected: any) => this.setState({ selected });
    private onFormChange = (e: React.ChangeEvent<HTMLInputElement>) => this.setState({ [e.currentTarget.name]: e.currentTarget.value } as any);

    protected renderBody(): JSX.Element {
        if (!this.state.sources) {
            return <p className='text-center'>Načítám křivky...</p>;
        }

        const { isGraph } = this.props.args;
        
        return (
            <Row>
                <Col>
                    <Tree
                        checkable
                        selectable={false}
                        multiple

                        onCheck={this.onCheck}
                    >
                    {this.state.sources.map(s => (
                        <TreeNode key={s.id} title={s.name}>
                        {s.datasets.map(d => (
                            <TreeNode key={`${s.id}::${d.id}`} title={d.name} />
                        ))}
                        </TreeNode>
                    ))}
                    </Tree>
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
                        <Form.Control name='timeRange'></Form.Control>
                        {/* TODO: time range */}
                    </Form.Group>
                </Col>
            ) : undefined}
            </Row>
        );
    }
    private okClicked = () => this.resolve(this.props.args.isGraph ? {
        id: 0,

        title: this.state.title,
        xLabel: this.state.xLabel, 
        yLabel: this.state.yLabel,

        xRange: [0, 0],
        traces: [],
    } as Graph : []);
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
    selected: string[];

    title: Graph['title'],
    xLabel: Graph['xLabel'],
    yLabel: Graph['yLabel'],
}

export type ImportResult = Graph | Trace[];

export default InfoModal;