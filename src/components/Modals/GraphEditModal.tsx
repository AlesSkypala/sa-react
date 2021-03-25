
import * as React from 'react';
import { Button, ModalTitle, Form } from 'react-bootstrap';
import { ModalComponent } from '.';
import { t } from '../../locale';

class GraphEditModal extends ModalComponent<EditResult, Args, State> {
    public state: State = {
        title: t('graph.new'),
        xLabel: 'osa x',
        yLabel: 'osa y',
    };

    public componentDidMount(): void {
        const { graph } = this.props;

        this.setState({
            title: graph.title,
            xLabel: graph.xLabel,
            yLabel: graph.yLabel,
        });
    }

    protected renderHeader(): JSX.Element {
        return (
            <ModalTitle>{t('modals.editGraph.title', { name: this.state.title })}</ModalTitle>
        );
    }

    
    private onFormSubmit = (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); this.okClicked(); }
    private onFormChange = (e: React.ChangeEvent<HTMLInputElement>) => this.setState({ [e.currentTarget.name]: e.currentTarget.value } as never);
    protected renderBody(): JSX.Element {
        return (
            <Form onSubmit={this.onFormSubmit}>
                <Form.Group>
                    <Form.Label>{t('graph.title')}</Form.Label>
                    <Form.Control name='title'  value={this.state.title}  onChange={this.onFormChange}></Form.Control>
                </Form.Group>
                <Form.Group>
                    <Form.Label>{t('graph.xLabel')}</Form.Label>
                    <Form.Control name='xLabel' value={this.state.xLabel} onChange={this.onFormChange}></Form.Control>
                </Form.Group>
                <Form.Group>
                    <Form.Label>{t('graph.yLabel')}</Form.Label>
                    <Form.Control name='yLabel' value={this.state.yLabel} onChange={this.onFormChange}></Form.Control>
                </Form.Group>
                <Form.Control type="submit" hidden />
            </Form>
        );
    }

    private okClicked = () => this.resolve(this.state);
    private cancelClicked = () => this.resolve(undefined);

    protected renderFooter(): JSX.Element {
        return (
            <>
                <Button variant='primary' onClick={this.okClicked}>
                    {t('modals.save')}
                </Button>
                <Button variant='secondary' onClick={this.cancelClicked}>
                    {t('modals.cancel')}
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