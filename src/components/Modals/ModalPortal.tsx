import * as React from 'react';
import { DialogService } from '../../services';
import ModalComponent from './ModalComponent';

class ModalPortal
    extends React.Component<Props, State> {
    public state: State = {};

    public componentDidMount() {
        DialogService.onOpen.on(this.onOpen);
    }

    public componentWillUnmount() {
        DialogService.onOpen.remove(this.onOpen);
    }

    private onOpen = (args: {type: typeof ModalComponent, resolve: ((result: never) => void), args: unknown }) => {
        this.setState(args);
    };

    private onClose = (res?: unknown) => {
        this.state.resolve && this.state.resolve(res);
        this.setState({ type: undefined, args: undefined, resolve: undefined });
    }

    public render() {
        const Type = this.state.type;

        if (Type) {
            return (
                <Type args={this.state.args} onClose={this.onClose} />
            );
        }

        return (<div />);
    }
}

export interface Props {
}

export interface State {
    type?: typeof ModalComponent;
    resolve?(result: unknown): void;
    args?: unknown;
}

export default ModalPortal;