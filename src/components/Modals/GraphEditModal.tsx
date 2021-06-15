
import moment from 'moment-timezone';
import * as React from 'react';
import { Button, ModalTitle, Form } from 'react-bootstrap';
import { ModalComponent, ModalProps } from '.';
import { t } from '../../locale';

export interface Args {
    graph: Graph;
}

interface State extends Pick<Graph, 'title' | 'xLabel' | 'yLabel' | 'timeZone'> {
    
}

export type EditResult = Partial<Pick<Graph, 'title' | 'xLabel' | 'yLabel'>> | undefined;

class GraphEditModal extends ModalComponent<EditResult, Args, State> {
    constructor(props: ModalProps<EditResult, Args>) {
        super(props);

        const { graph } = this.props;

        this.state = {
            title: graph.title,
            xLabel: graph.xLabel,
            yLabel: graph.yLabel,
            timeZone: graph.timeZone ?? 'UTC',
        };
    }

    protected renderHeader(): JSX.Element {
        return (
            <ModalTitle>{t('modals.editGraph.title', { name: this.state.title })}</ModalTitle>
        );
    }

    
    private onFormSubmit = (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); this.okClicked(); }
    private onFormChange = (e: React.ChangeEvent<HTMLInputElement>) => this.setState({ [e.currentTarget.name]: e.currentTarget.value } as never);
    private onFormSelect = (e: React.ChangeEvent<HTMLSelectElement>) => this.setState({ [e.currentTarget.name]: e.currentTarget.selectedOptions[0].value } as never);

    protected renderBody(): JSX.Element {
        const hasTimezones = this.props.graph.xType === 'datetime';
        const sourceTz = this.props.graph.metadata.timeZone;
        const localTz = moment.tz.guess();

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
                {hasTimezones && <Form.Group>
                    <Form.Label>{t('graph.timeZone')}</Form.Label>
                    <Form.Control as='select' name='timeZone' value={this.state.timeZone} onChange={this.onFormSelect}>
                        <option value='UTC'>UTC</option>
                        {localTz !== 'UTC' && localTz !== sourceTz && <option value={localTz}>{t('timeZone.local', { tz: localTz })}</option>}
                        {sourceTz && sourceTz !== 'UTC' && <option value={sourceTz}>{t('timeZone.device', { tz: sourceTz })}</option>}
                    </Form.Control>
                </Form.Group>}
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

export default GraphEditModal;