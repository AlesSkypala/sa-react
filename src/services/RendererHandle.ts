import { dataWorker } from '../index';
import type { RenderJob as WasmRenderJob } from '../plotting';

class RendererHandle {

    get raw_handle(): number { return this.handle; }

    constructor(private handle: number) {

    }

    public static async create(canvas: OffscreenCanvas): Promise<RendererHandle> {
        return new RendererHandle(await dataWorker.createRenderer(canvas));
    }

    public async dispose(): Promise<void> {
        if (this.handle >= 0) {
            await dataWorker.disposeRenderer(this.handle);
            this.handle = -1;
        }
    }

    public async resize(width: number, height: number): Promise<void> {
        await dataWorker.resizeRenderer(this.handle, width, height);
    }

    public createJob(x_type: string) {
        return new RenderJob(this, x_type);
    }
}

export class RenderJob {

    public content: Partial<Omit<WasmRenderJob, 'free'>> = {};
    public traces: ({ handle: number } & TraceStyle)[] = [];

    constructor(private handle: RendererHandle, public x_type: string) {

    }

    public async invoke(): Promise<void> {
        await dataWorker.invokeJob(this.handle.raw_handle, this);
    }

    public clear(val: boolean): RenderJob {
        this.content.clear = val;
        return this;
    }

    public zoom(...extents: number[]): RenderJob {
        this.content = {
            ...this.content,
            x_from: extents[0],
            x_to: extents[1],
            y_from: extents[2],
            y_to: extents[3],
        };
        return this;
    }

    public addTrace(handle: number, style: TraceStyle) {
        this.traces.push({ ...style, handle });
        return this;
    }
}

export default RendererHandle;