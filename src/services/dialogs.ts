import { EventEmitter } from ".";
import ModalComponent, { Props } from "../components/Modals/ModalComponent";

class Dialogs {
    public onOpen: EventEmitter<{ type: typeof ModalComponent, resolve: (result: any) => void; args: any; }> = new EventEmitter();

    public open<T extends ModalComponent<S, SS>, S, SS>(type: new (props: Props<S,SS>) => T, resolve: ((result: S) => void), args: SS): void {
        this.onOpen.emit({ type, resolve, args });
    }
}

const _instance = new Dialogs();
export default _instance;