import * as Comlink from 'comlink';
import * as uuid from 'uuid';
import type { GraphExtents, OffscreenGraphRenderer } from '../plotting';
import { default as DataService } from '../services/data';
import TraceData from '../services/TraceData';

let plotting: typeof import('../plotting');
import('../plotting').then(wasm => plotting = wasm);

type Extents = Pick<GraphExtents, 'x_start' | 'x_end' | 'y_start' | 'y_end'>;
type PickFuncs<T> = { [k in keyof T]: T[k] extends Function ? T[k] : never };

export class PlotWorkerProxy {
    private renderers: { [key: string]: OffscreenGraphRenderer } = {};
    private traceData: TraceData[] = [];

    public createOffscreen(canvas: OffscreenCanvas, extents: Extents): string {
        const uid = uuid.v4();
        
        this.renderers[uid] = new plotting.OffscreenGraphRenderer(canvas, extents.x_start, extents.x_end, extents.y_start, extents.y_end);

        return uid;
    }

    public disposeOffscreen(uid: string): boolean {
        if (this.renderers[uid]) {
            this.renderers[uid].free();
            delete this.renderers[uid];
            return true;
        }

        return false;
    }

    public callRendererFunc<T extends keyof PickFuncs<OffscreenGraphRenderer>>(uid: string, func: T, args: Parameters<OffscreenGraphRenderer[T]>): void {
        const renderer = this.renderers[uid];
        if (func === 'set_extents') {
            const extents = args[0] as Extents;
            args[0] = new plotting.GraphExtents(extents.x_start, extents.x_end, extents.y_start, extents.y_end);
        }
        // console.log(`calling ${func} on ${uid} with args`);
        // for (let a of args) console.log(a);
        (renderer[func] as ((...a: typeof args) => void))(...args);
    }

    public async clearChart(uid: string) {
        const renderer = this.renderers[uid];

        renderer.clear();
        renderer.draw_chart();
    }

    public async clearRenderTraces(uid: string, traces: number[]) {
        const renderer = this.renderers[uid];

        renderer.clear();
        renderer.draw_chart();
        for (let ptr of traces) {
            renderer.draw_trace(ptr);
        }
    }

    public async renderTraces(uid: string, traces: number[]) {
        const renderer = this.renderers[uid];
        
        renderer.clear();
        renderer.draw_chart();
        for (let ptr of traces) {
            renderer.draw_trace(ptr);
        }
    }

    public async getTraceData(from: any, to: any, traces: Trace[]) {
        const result = await DataService.getTraceData(from, to, traces);
        this.traceData.push(...result);

        return result.map(t => ({ id: t.trace.id, ptr: t.ptr }));
    }

    public getExtentRecommendation(trace_ptrs: number[], overhang: number = 0.0) {
        const { x_start, x_end, y_start, y_end } = plotting.recommend_range_all(new Uint32Array(trace_ptrs), overhang);
        return { x_start, x_end, y_start, y_end };
    }
}

Comlink.expose(new PlotWorkerProxy());

export {};