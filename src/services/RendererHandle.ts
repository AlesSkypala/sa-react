/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { transfer } from 'comlink';
import { dataWorker } from '../index';
import type { RenderJob as WasmRenderJob } from '../plotting';

class RendererHandle {

    get raw_handle(): number { return this.handle; }
    public bundles: { handle: number, traces: Set<number> }[] = [];

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

    public createJob(x_type: string, traces: number, blacklist: number) {
        return new RenderJob(this, x_type, traces, blacklist);
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

        this.bundles.push({ handle, traces: new Set(traces.map(t => t.handle)) });

        return handle;
    }
}

const TRACE_LEN = 2 * Uint32Array.BYTES_PER_ELEMENT + 3 * Uint8Array.BYTES_PER_ELEMENT;
export class RenderJob {

    public content: Partial<Omit<WasmRenderJob, 'free'>> = {};
    public bundles: number[] = [];
    
    private traces: ArrayBuffer;
    private tracesView: DataView | undefined;
    private tracesCursor = 0;

    private blacklist: ArrayBuffer;
    private blacklistView: DataView | undefined;
    private blacklistCursor = 0;


    constructor(private handle: RendererHandle, public x_type: string, expectedTraceCount: number, blacklistSize: number) {
        this.traces = new ArrayBuffer(expectedTraceCount * TRACE_LEN);
        this.blacklist = new ArrayBuffer(Uint32Array.BYTES_PER_ELEMENT * blacklistSize); 
        this.tracesView = new DataView(this.traces);
        this.blacklistView = new DataView(this.blacklist);
    }

    public async invoke(): Promise<void> {
        delete this.tracesView;
        delete this.blacklistView;

        await dataWorker.invokeRenderJob(this.handle.raw_handle, this.x_type, this.content, transfer(this.traces, [ this.traces ]), this.bundles, transfer(this.blacklist, [ this.blacklist ]));
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

        this.tracesView!.setUint32(this.tracesCursor, trace.handle);
        this.tracesView!.setUint32(this.tracesCursor + 4, trace.style.width);
        this.tracesView!.setUint8( this.tracesCursor + 8, trace.style.color[0]);
        this.tracesView!.setUint8( this.tracesCursor + 9, trace.style.color[1]);
        this.tracesView!.setUint8( this.tracesCursor + 10, trace.style.color[2]);

        this.tracesCursor += TRACE_LEN;
        return this;
    }

    public blacklistTrace(trace: Pick<Trace, 'handle'>) {
        this.blacklistView!.setUint32(this.blacklistCursor, trace.handle);

        this.blacklistCursor += Uint32Array.BYTES_PER_ELEMENT;
        return this;
    }

    public addBundle(bundle: number) {
        this.bundles.push(bundle);
        
        return this;
    }
}

export default RendererHandle;