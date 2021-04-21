import { transfer } from 'comlink';
import { dataWorker } from '../index';
import type { RenderJob as WasmRenderJob } from '../plotting';

class RendererHandle {

    get raw_handle(): number { return this.handle; }
    private bundles: number[] = [];

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

    public createJob(x_type: string, traces: number) {
        return new RenderJob(this, x_type, traces);
    }

    public async createBundle(range: Graph['xRange'], traces: Pick<Trace, 'handle' | 'style'>[]): Promise<number> {
        const data = new ArrayBuffer(traces.length * TRACE_LEN);
        const view = new DataView(data);
        let cursor = 0;

        for (const trace of traces) {
            view.setUint32(cursor, trace.handle);
            view.setUint32(cursor + 4, trace.style.width);
            view.setUint8(cursor + 8, trace.style.color[0]);
            view.setUint8(cursor + 9, trace.style.color[1]);
            view.setUint8(cursor + 10, trace.style.color[2]);

            cursor += TRACE_LEN;
        }

        const handle = await dataWorker.createBundle(this.handle, range, transfer(data, [data]));

        this.bundles.push(handle);

        return handle;
    }
}

const TRACE_LEN = 4 + 4 + 3; // 
export class RenderJob {

    public content: Partial<Omit<WasmRenderJob, 'free'>> = {};
    public bundles: number[] = [];
    // public traces: (Pick<Trace, 'id'> & TraceStyle)[] = [];
    public traces: ArrayBuffer;
    public view: DataView;
    private cursor = 0;

    constructor(private handle: RendererHandle, public x_type: string, expectedTraceCount: number) {
        this.traces = new ArrayBuffer(expectedTraceCount * TRACE_LEN);
        this.view = new DataView(this.traces);
    }

    public async invoke(): Promise<void> {
        delete (this as unknown as Partial<RenderJob>).view;
        await dataWorker.invokeRenderJob(this.handle.raw_handle, this.x_type, this.content, transfer(this.traces, [ this.traces ]), this.bundles);
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

    public margin(margin: number): RenderJob {
        this.content.margin = margin;
        return this;
    }

    public labelSpaces(x_label: number, y_label: number): RenderJob {
        this.content.x_label_space = x_label;
        this.content.y_label_space = y_label;
        return this;
    }

    public addTrace(trace: Trace) {
        this.view.setUint32(this.cursor, trace.handle);
        this.view.setUint32(this.cursor + 4, trace.style.width);
        this.view.setUint8(this.cursor + 8, trace.style.color[0]);
        this.view.setUint8(this.cursor + 9, trace.style.color[1]);
        this.view.setUint8(this.cursor + 10, trace.style.color[2]);

        this.cursor += TRACE_LEN;
        return this;
    }

    public addBundle(bundle: number) {
        this.bundles.push(bundle);
        
        return this;
    }
}

export default RendererHandle;