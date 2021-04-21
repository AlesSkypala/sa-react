import * as Comlink from 'comlink';
import DataService from '../services/data';

import type { RendererContainer } from '../plotting';
import type { RenderJob, DataJob } from '../services';

let plotting: typeof import('../plotting');
import('../plotting').then(wasm => plotting = wasm);

export class DataWorkerProxy {
    private availableRendererHandle = 0;
    private renderers: { [key: number]: RendererContainer } = {};
    private traces: { [key: string]: number } = {};

    public createRenderer(canvas: OffscreenCanvas) {
        const renderer = plotting.RendererContainer.new_webgl(canvas);
        const handle = this.availableRendererHandle++;
        
        this.renderers[handle] = renderer;

        return handle;
    }

    public disposeRenderer(handle: number) {
        if (handle in this.renderers) {
            this.renderers[handle].free();
            delete this.renderers[handle];
        }
    }

    public createBundle(handle: number, range: Graph['xRange'], data: ArrayBuffer): number {
        const renderer = this.renderers[handle];

        if (!renderer) throw new Error('Renderer with given handle does not exist.');

        return renderer.create_bundle_from_stream(range[0], range[1], new Uint8Array(data));
    }

    public disposeBundle(handle: number, bundle: number) {
        const renderer = this.renderers[handle];

        if (!renderer) throw new Error('Renderer with given handle does not exist.');

        renderer.dispose_bundle(bundle);
    }

    public invokeRenderJob(handle: number, x_type: string, content: RenderJob['content'], traces: ArrayBuffer, bundles: number[]) {
        const renderer = this.renderers[handle];

        if (!renderer) throw new Error('Renderer with given handle does not exist.');

        const wmjob = new plotting.RenderJob(x_type, traces.byteLength / 11, 0);
        
        wmjob.clear = true;
        Object.assign(wmjob, content);

        const view = new DataView(traces);
        console.log(traces.byteLength / 11);
    
        for (let i = 0; i < view.byteLength; i += 11) {
            const handle = view.getUint32(i);
            const width = view.getUint32(i + 4);
            wmjob.add_trace(
                handle,
                new Uint8Array([
                    view.getUint8(i + 8),
                    view.getUint8(i + 9),
                    view.getUint8(i + 10),
                ]),
                width
            );
        }

        for (const bundle of bundles) {
            wmjob.add_bundle(bundle);
        }

        const n = performance.now();

        renderer.render(wmjob);

        console.log(`render time: ${performance.now() - n}`);
    }

    public async invokeDataJob(job: DataJob): Promise<DataJobResult> {
        const sources = await DataService.getSources();

        const result: { [key: string]: number } = {};

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
                    result[trid] = this.traces[trid] = plotting.create_trace(trid, trace?.xType, trace?.yType);
                }
            }

            const data = await DataService.getBulkData(bulk, job.range);
            plotting.bulkload_segments(new Uint32Array(ids.map(i => this.traces[i])), trace.xType, trace.yType, new Uint8Array(data[1]));
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