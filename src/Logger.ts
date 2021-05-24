
class Logger {

    public debug(obj: unknown) {
        console.debug(obj);
    }

    public info(obj: unknown) {
        console.info(obj);
    }

    public log(obj: unknown) {
        console.log(obj);
    }

    public warn(obj: unknown) {
        console.log(obj);
    }

    public error(obj: unknown) {
        console.error(obj);
    }
}

const _Logger = new Logger();
export default _Logger;