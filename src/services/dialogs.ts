import { EventEmitter } from '.';
import { ModalComponent, ModalProps, ConfirmArgs, ConfirmModal } from '../components/Modals';

class Dialogs {
    public onOpen: EventEmitter<{ type: typeof ModalComponent, resolve: (result: never) => void; args: unknown; }> = new EventEmitter();

    public open<T extends ModalComponent<S, SS>, S, SS>(type: new (props: ModalProps<S,SS>) => T, resolve: ((result: S) => void), args: SS): void {
        this.onOpen.emit({ type, resolve, args });
    }

    public openConfirmation(args: ConfirmArgs, resolve: ((result: boolean | undefined) => void)) {
        this.onOpen.emit({ type: ConfirmModal, args, resolve });
    }
}

const _instance = new Dialogs();
export default _instance;