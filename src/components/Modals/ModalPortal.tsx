import { connect } from 'react-redux';
import * as React from 'react';
import ModalComponent from './ModalComponent';
import { close_modal } from '../../redux/modals';

class ModalPortal
    extends React.Component<Props> {

    private onClose = (res?: unknown) => {
        this.props.onClose && this.props.onClose(res);
    }

    public render() {
        const Type = this.props.type;

        if (Type) {
            return (
                <Type args={this.props.args} onClose={this.onClose} />
            );
        }

        return (<div />);
    }
}

export interface Props {
    type?: typeof ModalComponent;
    args?: unknown;

    onClose(res?: unknown): void;
}


export default connect(
    (state: RootStore) => ({
        type: state.modals.modal?.type,
        args: state.modals.modal?.args
    }),
    (dispatch: RootDispatch) => ({
        onClose: (res?: unknown) => dispatch(close_modal(res)),
    })
)(ModalPortal);