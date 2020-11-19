import * as React from 'react';
import { Modal, ModalBody, ModalFooter } from 'react-bootstrap';
import ModalHeader from 'react-bootstrap/ModalHeader';

abstract class ModalComponent<R, T = any, S = {}>
extends React.Component<Props<R, T>, S> {

    protected abstract renderHeader(): JSX.Element;
    protected abstract renderBody(): JSX.Element;
    protected abstract renderFooter(): JSX.Element;

    private onHide = () => this.resolve(undefined);

    protected resolve(result?: R) {
        this.props.onClose && this.props.onClose(result);
    }

    public render() {
        return (
            <Modal size='lg' show onHide={this.onHide}>
                <ModalHeader closeButton>
                {this.renderHeader()}
                </ModalHeader>
                <ModalBody>
                {this.renderBody()}
                </ModalBody>
                <ModalFooter>
                {this.renderFooter()}
                </ModalFooter>
            </Modal>
        );
    }
}

export interface Props<R, T> {
    onClose(result?: R): void;
    args: T;
}

export default ModalComponent;