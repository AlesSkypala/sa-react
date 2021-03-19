import EventEmitter from './EventEmitter';
import { ContainerLayout } from '../components';

class AppEvents {
    public onRelayout = new EventEmitter<{ type: StackingType, layout: ContainerLayout }>();
    // public zoomSync = new EventEmitter<Graph['zoom']>();

    // public performZoomSync = (zoom: Graph['zoom']): void => this.zoomSync.emit(zoom);
}

const _instance = new AppEvents();
export default _instance;