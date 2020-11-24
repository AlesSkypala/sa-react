import EventEmitter from "./EventEmitter";

class Controls {
    public zoomSync = new EventEmitter<Graph['zoom']>();

    public performZoomSync = (zoom: Graph['zoom']): void => this.zoomSync.emit(zoom);
}

const _instance = new Controls();
export default _instance;