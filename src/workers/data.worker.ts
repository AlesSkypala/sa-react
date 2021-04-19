import * as Comlink from 'comlink';
import DataService from '../services/data';

import type { RendererContainer, RenderJob as WasmRenderJob } from '../plotting';
import type { RenderJob, DataJob } from '../services';

let plotting: typeof import('../plotting');
import('../plotting').then(wasm => plotting = wasm);

export class DataWorkerProxy {
    private availableRendererHandle = 0;
    private renderers: { [key: number]: RendererContainer } = {};
    private traces: { [key: string]: number } = {};

    public createRenderer(canvas: OffscreenCanvas) {
        const renderer = plotting.RendererContainer.new_offscreen(canvas);
        const handle = this.availableRendererHandle++;
        
        this.renderers[handle] = renderer;

        return handle;
    }

    private applyToWasm = (from: RenderJob, to: WasmRenderJob) => {
        to.clear = true;
        Object.assign(to, from.content);
    
        for (const trace of from.traces) {
            to.add_trace(this.traces[trace.id], new Uint8Array(trace.color), trace.width);
        }
    }

    public disposeRenderer(handle: number) {
        if (handle in this.renderers) {
            this.renderers[handle].free();
            delete this.renderers[handle];
        }
    }

    public invokeRenderJob(handle: number, job: RenderJob) {
        const renderer = this.renderers[handle];

        if (!renderer) throw new Error('Renderer with given handle does not exist.');

        const wmjob = new plotting.RenderJob(job.x_type);
        this.applyToWasm(job, wmjob);
        renderer.render(wmjob);
    }

    public async invokeDataJob(job: DataJob): Promise<DataJobResult> {
        const sources = await DataService.getSources();

        const result: Trace['id'][] = [];

        for (const bulk of job.bulkDownload) {
            const trace = sources
                .find(s => s.id === bulk.source)?.datasets
                .find(ds => ds.id === bulk.id);

            if (!trace) break;

            if (!bulk.variants) {
                bulk.variants = await DataService.getTraceVariants({ source: bulk.source, id: bulk.id });
            }
            
            const ids = [];
            for (const variant of bulk.variants) {
                const trid = `${bulk.source}::${bulk.id}::${variant}`;

                ids.push(trid);

                if (!(trid in this.traces)) {
                    this.traces[trid] = plotting.create_trace(trid, trace?.xType, trace?.yType);
                }
            }

            const data = await DataService.getBulkData(bulk, job.range);
            plotting.bulkload_segments(new Uint32Array(ids.map(i => this.traces[i])), trace.xType, trace.yType, new Uint8Array(data[1]));

            result.push(...ids);
        }

        return {
            loadedTraces: result,
        };
    }

    public resizeRenderer(handle: number, width: number, height: number) {
        const renderer = this.renderers[handle];

        if (!renderer) throw new Error('Renderer with given handle does not exist.');

        renderer.size_changed(width, height);
    }

    public threshold(from: number, to: number, val: number, traces: Trace['id'][]): boolean[] {
        return traces.map(t => plotting.treshold(this.traces[t], from, to, val));
    }

    public is_zero(from: number, to: number, traces: Trace['id'][]): boolean[] {
        return traces.map(t => plotting.is_zero(this.traces[t], from, to));
    }

    public recommend_extents(from: number, to: number, traces: Trace['id'][]): [ number, number, number, number ] {
        return traces.map(t => plotting.get_extents(this.traces[t], from, to))
            .reduce(
                (prev, cur) => [
                    cur[0],
                    cur[1],
                    Math.min(cur[2], prev[2]),
                    Math.max(cur[3], prev[3])
                ],
                [0,0, Number.MAX_VALUE, Number.MIN_VALUE]
            );
    }
}

Comlink.expose(new DataWorkerProxy());

export {};