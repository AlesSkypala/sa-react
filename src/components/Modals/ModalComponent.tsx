import * as React from 'react';
import { Modal, ModalBody, ModalFooter, ModalProps } from 'react-bootstrap';
import ModalHeader from 'react-bootstrap/ModalHeader';

abstract class ModalComponent<Result, Args = unknown, State = unknown>
    extends React.Component<Props<Result, Args>, State> {
    
    protected size: ModalProps['size'] = 'lg';

    protected abstract renderHeader(): React.ReactNode;
    protected abstract renderBody(): React.ReactNode;
    protected abstract renderFooter(): React.ReactNode;

    private onHide = () => this.resolve(undefined);


    protected resolve(result?: Result) {
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

// export type ModalConstructor<T extends ModalComponent<unknown>> = T extends ModalComponent<infer Result, infer Args> ? new (props: Props<Result, Args>) => T : never;

export type Props<R, T> = T & {
    onClose(result?: R): void;
}

export default ModalComponent;