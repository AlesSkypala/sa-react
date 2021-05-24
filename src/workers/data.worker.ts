import * as Comlink from 'comlink';
import DataService from '../services/DataApi';

import type { RendererContainer } from '../plotting';
import type { RenderJob, DataJob } from '../services';
import Logger from '../Logger';

type RenderJobResult = {
    x_ticks: { val: number, pos: number }[],
    y_ticks: { val: number, pos: number }[],
};

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

    public rebundle(handle: number, bundle: number, toDel: ArrayBuffer, toAdd: ArrayBuffer, toMod: ArrayBuffer) {
        const renderer = this.renderers[handle];

        if (!renderer) throw new Error('Renderer with given handle does not exist.');

        renderer.rebundle(bundle, new Uint8Array(toDel), new Uint8Array(toAdd), new Uint8Array(toMod));
    }

    public invokeRenderJob(handle: number, x_type: string, content: RenderJob['content'], traces: ArrayBuffer, bundles: number[], blacklist: ArrayBuffer): RenderJobResult {
        const renderer = this.renderers[handle];

        if (!renderer) throw new Error('Renderer with given handle does not exist.');

        const wmjob = new plotting.RenderJob(x_type, traces.byteLength / 11, 0);
        
        wmjob.clear = true;
        Object.assign(wmjob, content);

        wmjob.deserialize_traces(new Uint8Array(traces));

        for (const bundle of bundles) {
            wmjob.add_bundle(bundle);
        }

        wmjob.deserialize_blacklist(new Uint8Array(blacklist));

        return renderer.render(wmjob);
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
                bulk.variants = await DataService.getVariantRecommendation(bulk.source, bulk.id, job.range);
            }
            
            const ids = [];
            for (const variant of bulk.variants) {
                const trid = `${bulk.source}::${bulk.id}::${variant}`;

                ids.push(trid);

                if (trid in this.traces) {
                    result[trid] = this.traces[trid];
                } else {
                    result[trid] = this.traces[trid] = plotting.create_trace(trid, trace?.xType, trace?.yType);
                }
            }

            const data = await DataService.getBulkData(bulk, job.range);
            if (data[1].byteLength > 0) {
                plotting.bulkload_segments(new Uint32Array(ids.map(i => this.traces[i])), trace.xType, trace.yType, new Uint8Array(data[1]));
            } else {
                Logger.warn(`No data received via bulkload for job ${job.handle}!`);
            }
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

    public threshold(from: number, to: number, val: number, handles: number[]): boolean[] {
        return handles.map(t => plotting.treshold(t, from, to, val));
    }

    public is_zero(from: number, to: number, handles: number[]): boolean[] {
        return handles.map(t => plotting.is_zero(t, from, to));
    }

    public recommend_extents(from: number, to: number, handles: number[]): [ number, number, number, number ] {
        if (handles.length <= 0) {
            return [ from, to, 0, 1 ];
        }

        const zoom = handles.map(t => plotting.get_extents(t, from, to))
            .reduce(
                (prev, cur) => [
                    cur[0],
                    cur[1],
                    Math.min(cur[2], prev[2]),
                    Math.max(cur[3], prev[3])
                ],
                [0,0, Number.MAX_VALUE, Number.MIN_VALUE]
            ) as [number,number,number,number];

        if (Math.abs(zoom[3] - zoom[2]) < 1e-3) {
            zoom[3] = zoom[2] + 0.9;
            zoom[2] -= 0.1;
        }

        return zoom;
    }
}

Comlink.expose(new DataWorkerProxy());

export {};