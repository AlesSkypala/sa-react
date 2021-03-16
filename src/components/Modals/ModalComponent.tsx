import * as React from 'react';
import { Modal, ModalBody, ModalFooter, ModalProps } from 'react-bootstrap';
import ModalHeader from 'react-bootstrap/ModalHeader';

abstract class ModalComponent<R, T = unknown, S = unknown>
    extends React.Component<Props<R, T>, S> {
    
    protected size: ModalProps['size'] = 'lg';

    protected abstract renderHeader(): React.ReactNode;
    protected abstract renderBody(): React.ReactNode;
    protected abstract renderFooter(): React.ReactNode;

    private onHide = () => this.resolve(undefined);


    protected resolve(result?: R) {
        this.props.onClose && this.props.onClose(result);
    }

    public render() {
        return (
            <Modal size={this.size} show onHide={this.onHide}>
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