import { DataService, Deserialization } from ".";
import sg from 'ml-savitzky-golay-generalized';

class TraceData {
    constructor(public readonly trace: Trace, private specs: PipelineSpecs, private data: DataView) {

    }

    public getTraceHash() {
        return DataService.getTraceHash(this.trace);
    }

    public async isZero() {
        return await Deserialization.isZero(this.specs, this.data);
    }

    public async toPlotly(): Promise<{x: any[], y: any[]}> {
        const data = await Deserialization.deserializePlotly(this.specs, this.data);

        if (this.trace.filtering === 'sg' && data.x.length > 9) {
            const filtered = sg(data.y, data.x, { derivative: 0 });
            return { y: filtered, x: data.x };
        }

        return data;
    }

    public async treshold(tres: number): Promise<boolean> {
        return await Deserialization.treshold(this.specs, this.data, tres);
    }
}

export default TraceData;