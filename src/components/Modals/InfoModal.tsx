
import * as React from 'react';
import { Button, ModalTitle } from 'react-bootstrap';
import { ModalComponent } from '.';
import { t } from '../../locale';

class InfoModal
    extends ModalComponent<void, Args> {
    protected renderHeader(): JSX.Element {
        return (
            <ModalTitle>{this.props.title}</ModalTitle>
        );
    }
    protected renderBody(): JSX.Element {
        return this.props.body as JSX.Element;
    }
    private okClicked = () => this.resolve(undefined);
    protected renderFooter(): JSX.Element {
        return (
            <Button variant='primary' onClick={this.okClicked}>
                {this.props.okButton || t('modals.ok')}
            </Button>
        );
    }
}

export interface Args {
    title: string;
    body: string | JSX.Element;
    
    okButton?: string;
}

export default InfoModal;