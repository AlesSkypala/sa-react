
import * as React from 'react';
import { Button, Form, ModalTitle } from 'react-bootstrap';
import { ModalComponent } from '.';
import { t } from '../../locale';

export interface Args {
    graphTitle: string;
}

export type State = {
    ignoreNext: boolean;
}

class GraphDeleteConfirmation
    extends ModalComponent<{ delete: boolean, ignoreNext: boolean }, Args, State> {
    public state: State = {
        ignoreNext: false
    };

    private onAskChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        this.setState({ ignoreNext: Boolean(e.currentTarget.checked) });
    }

    protected renderHeader(): JSX.Element {
        return (
            <ModalTitle>{t('modals.removeGraph.title', { name: this.props.graphTitle })}</ModalTitle>
        );
    }
    protected renderBody(): React.ReactNode {
        return (
            <>
                {t('modals.removeGraph.body')}
                <Form.Group className='mt-3'>
                    <Form.Check type='checkbox' label={t('modals.removeGraph.dontAsk')} onChange={this.onAskChange} checked={this.state.ignoreNext} />
                </Form.Group>
            </>
        );
    }

    private cancelClicked = () => this.resolve({ delete: false, ignoreNext: this.state.ignoreNext });
    private okClicked = () => this.resolve({ delete: true, ignoreNext: this.state.ignoreNext });

    protected renderFooter(): JSX.Element {
        return (
            <>
                <Button variant={'danger'} onClick={this.okClicked}>
                    {t('modals.ok')}
                </Button>
                <Button variant={'secondary'} onClick={this.cancelClicked}>
                    {t('modals.cancel')}
                </Button>
            </>
        );
    }
}

export default GraphDeleteConfirmation;