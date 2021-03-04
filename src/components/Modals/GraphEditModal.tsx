
import * as React from 'react';
import { Button, Col, ModalTitle, Row, Form } from 'react-bootstrap';
import { ModalComponent } from '.';

class GraphEditModal extends ModalComponent<EditResult, Args, State> {
    public state: State = {
        title: 'Nový graf',
        xLabel: 'osa x',
        yLabel: 'osa y',
    };

    public componentDidMount(): void {
        const { graph } = this.props.args;

        this.setState({
            title: graph.title,
            xLabel: graph.xLabel,
            yLabel: graph.yLabel,
        });
    }

    protected renderHeader(): JSX.Element {
        return (
            <ModalTitle>Upravit graf</ModalTitle>
        );
    }

    private onFormChange = (e: React.ChangeEvent<HTMLInputElement>) => this.setState({ [e.currentTarget.name]: e.currentTarget.value } as never);
    protected renderBody(): JSX.Element {
        return (
            <Row>
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
                </Col>
            </Row>
        );
    }

    private okClicked = () => this.resolve(this.state);
    private cancelClicked = () => this.resolve(undefined);

    protected renderFooter(): JSX.Element {
        return (
            <>
                <Button variant='primary' onClick={this.okClicked}>
                Uložit
                </Button>
                <Button variant='secondary' onClick={this.cancelClicked}>
                Zrušit
                </Button>
            </>
        );
    }
}

export interface Args {
    graph: Graph;
}

interface State extends Pick<Graph, 'title' | 'xLabel' | 'yLabel'> {
    
}

export type EditResult = Partial<Pick<Graph, 'title' | 'xLabel' | 'yLabel'>> | undefined;

export default GraphEditModal;