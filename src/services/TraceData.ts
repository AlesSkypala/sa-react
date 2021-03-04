import { default as DataService } from './data';
// import sg from 'ml-savitzky-golay-generalized';
import type { GraphExtents } from '../plotting';

type Plotting = typeof import('../plotting');

let plotting: Plotting;
import('../plotting').then(wsm => plotting = wsm);

class TraceData {
    private dataPtr: number;

    constructor(public readonly trace: Trace, private specs: PipelineSpecs, _data: ArrayBuffer) {
        this.dataPtr = plotting.malloc_data(new Uint8Array(_data), this.trace.id, this.specs.xType, this.specs.yType);
    }

    public getTraceHash(): string {
        return DataService.getTraceHash(this.trace);
    }

    public isZero(): boolean {
        return plotting.is_zero(this.dataPtr);
    }

    public treshold(tres: number): boolean {
        return plotting.treshold(this.dataPtr, tres);
    }

    public getRecommendation(overhang = 0.0): GraphExtents {
        return plotting.recommend_range(this.dataPtr, overhang);
    }

    public static getRecommendation(traces: TraceData[], overhang = 0.0) {
        return plotting.recommend_range_all(new Uint32Array(traces.map(t => t.dataPtr)), overhang);
    }

    public get ptr() { return this.dataPtr; }
}

export default TraceData;