import EventEmitter from './EventEmitter';

class AppEvents {
    public onRelayout = new EventEmitter<{ type: StackingType, layout: unknown }>();
    // public zoomSync = new EventEmitter<Graph['zoom']>();

    // public performZoomSync = (zoom: Graph['zoom']): void => this.zoomSync.emit(zoom);
}

const _instance = new AppEvents();
export default _instance;