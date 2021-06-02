/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { transfer } from 'comlink';
import { dataWorker } from '../index';
import type { RenderJob as WasmRenderJob } from '../plotting';

class RendererHandle {

    get raw_handle(): number { return this.handle; }
    public bundles: { handle: number, traces: { [handle: number]: number } }[] = [];

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

    public async createBundle(range: Graph['xRange'], traces: Pick<Trace, 'handle' | 'style' | 'rev'>[]): Promise<number> {
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

        this.bundles.push({ handle, traces: traces.reduce<{ [handle: number]: number }>((prev, t) => { prev[t.handle] = t.rev; return prev; }, {}) });

        return handle;
    }

    public rebundle(bundle: number, additions: number, deletions: number, modifs: number) {
        return new RebundleJob(this, bundle, additions, deletions, modifs);
    }
}

const TRACE_LEN = 2 * Uint32Array.BYTES_PER_ELEMENT + 4 * Uint8Array.BYTES_PER_ELEMENT;

const writeTrace = (trace: Pick<Trace, 'handle' | 'style'>, view: DataView, cursor: number) => {
    view.setUint32(cursor, trace.handle);
    view.setUint32(cursor + 4, trace.style.width);
    view.setUint8( cursor + 8, trace.style.color[0]);
    view.setUint8( cursor + 9, trace.style.color[1]);
    view.setUint8( cursor + 10, trace.style.color[2]);
    view.setUint8( cursor + 11, trace.style.points ? 1 : 0);
};

export class RenderJob {

    public content: Partial<Omit<WasmRenderJob, 'free'>> = {};
    public bundles: number[] = [];
    
    private traces: ArrayBuffer;
    private tracesView: DataView | undefined;
    private tracesCursor = 0;

    private blacklist: ArrayBuffer;
    private blacklistView: DataView | undefined;
    private blacklistCursor = 0;


    constructor(private renderer: RendererHandle, public x_type: string, expectedTraceCount: number, blacklistSize: number) {
        this.traces = new ArrayBuffer(expectedTraceCount * TRACE_LEN);
        this.blacklist = new ArrayBuffer(Uint32Array.BYTES_PER_ELEMENT * blacklistSize); 
        this.tracesView = new DataView(this.traces);
        this.blacklistView = new DataView(this.blacklist);
    }

    public invoke() {
        delete this.tracesView;
        delete this.blacklistView;

        return dataWorker.invokeRenderJob(this.renderer.raw_handle, this.x_type, this.content, transfer(this.traces, [ this.traces ]), this.bundles, transfer(this.blacklist, [ this.blacklist ]));
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
        writeTrace(trace, this.tracesView!, this.tracesCursor);
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

export class RebundleJob {
    private addition: ArrayBuffer;
    private additionView: DataView | undefined;
    private additionCursor = 0;

    private deletion: ArrayBuffer;
    private deletionView: DataView | undefined;
    private deletionCursor = 0;

    private modif: ArrayBuffer;
    private modifView: DataView | undefined;
    private modifCursor = 0;

    constructor(private renderer: RendererHandle, private bundle: number, additions: number, deletions: number, modifs: number) {
        this.addition = new ArrayBuffer(TRACE_LEN * additions);
        this.deletion = new ArrayBuffer(Uint32Array.BYTES_PER_ELEMENT * deletions);
        this.modif    = new ArrayBuffer(TRACE_LEN * modifs);

        this.additionView = new DataView(this.addition);
        this.deletionView = new DataView(this.deletion);
        this.modifView    = new DataView(this.modif);
    }

    public addTrace(trace: Pick<Trace, 'handle' | 'style' | 'rev'>) {
        const bundle = this.renderer.bundles.find(r => r.handle === this.bundle);
        bundle && (bundle.traces[trace.handle] = trace.rev);

        writeTrace(trace, this.additionView!, this.additionCursor);
        this.additionCursor += TRACE_LEN;
        return this;
    }

    public modifyTrace(trace: Pick<Trace, 'handle' | 'style' | 'rev'>) {
        const bundle = this.renderer.bundles.find(r => r.handle === this.bundle);
        bundle && (bundle.traces[trace.handle] = trace.rev);
        
        writeTrace(trace, this.modifView!, this.modifCursor);
        this.modifCursor += TRACE_LEN;
        return this;
    }

    public deleteTrace(trace: Pick<Trace, 'handle'>) {
        const bundle = this.renderer.bundles.find(r => r.handle === this.bundle);
        bundle && (delete bundle.traces[trace.handle]);

        this.deletionView!.setUint32(this.deletionCursor, trace.handle);
        this.deletionCursor += Uint32Array.BYTES_PER_ELEMENT;
        return this;
    }

    public async invoke(): Promise<void> {
        await dataWorker.rebundle(
            this.renderer.raw_handle,
            this.bundle,
            transfer(this.deletion, [ this.deletion ]),
            transfer(this.addition, [ this.addition ]),
            transfer(this.modif,    [ this.modif ]),
        );
    }
}

export default RendererHandle;