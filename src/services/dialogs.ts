import EventEmitter from './EventEmitter';
import { ModalComponent, ModalProps, ConfirmArgs, ConfirmModal } from '../components/Modals';

class Dialogs {
    public onOpen: EventEmitter<{ type: typeof ModalComponent, resolve: (result: never) => void; args: unknown; }> = new EventEmitter();

    public open<T extends ModalComponent<Result, Args, State>, Result, Args, State>(type: new (props: ModalProps<Result,Args>) => T, resolve: ((result: Result) => void), args: Args): void {
        this.onOpen.emit({ type, resolve, args });
    }

    public openConfirmation(args: ConfirmArgs, resolve: ((result: boolean | undefined) => void)) {
        this.onOpen.emit({ type: ConfirmModal, args, resolve });
    }
}

const _instance = new Dialogs();
export default _instance;