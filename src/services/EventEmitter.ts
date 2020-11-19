export default class EventEmitter<T> {
    private handlers: ((args: T) => void)[] = [];

    public on = (f: (args: T) => void) => {
        this.handlers.push(f);
    }

    public remove = (f: (args: T) => void) => {
        const idx = this.handlers.indexOf(f);

        if (idx >= 0) {
            this.handlers.splice(idx, 1);
        }
    }

    public emit = (args: T) => {
        this.handlers.forEach(h => h(args));
    }
}