
import * as React from 'react';
import { Button, ModalTitle } from 'react-bootstrap';
import { ModalComponent } from '.';

class ConfirmationModal
    extends ModalComponent<boolean, Args> {
    protected renderHeader(): JSX.Element {
        return (
            <ModalTitle>{this.props.args.title}</ModalTitle>
        );
    }
    protected renderBody(): React.ReactNode {
        return this.props.args.body;
    }
    private cancelClicked = () => this.resolve(false);
    private okClicked = () => this.resolve(true);

    protected renderFooter(): JSX.Element {
        const { okColor, okTitle, cancelColor, cancelTitle } = this.props.args;
        return (
            <>
                <Button variant={okColor || 'primary'} onClick={this.okClicked}>
                    {okTitle || 'OK'}
                </Button>
                <Button variant={cancelColor || 'secondary'} onClick={this.cancelClicked}>
                    {cancelTitle || 'Zrušit'}
                </Button>
            </>
        );
    }
}

export interface Args {
    title: string;
    body: React.ReactNode;
    
    okColor?: string;
    okTitle?: string;
    cancelColor?: string;
    cancelTitle?: string;
}

export default ConfirmationModal;