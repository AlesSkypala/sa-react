import { dataWorker } from '..';

let availableHandle = 0;

type OpTrace = {
    id: Trace['id'],
    xType: Graph['xType'],
    operation: 'sum' | 'avg',
    handles: number[],

    title?: string,
};

class DataJob {
    public handle = -1;

    public relatedGraphs: Graph['id'][] = [];
    public bulkDownload: { source: string, id: string, variants?: string[] }[] = [];
    public ops: OpTrace[] = [];
    // public pipelineDownload: { pipe }[] = [];

    constructor(
        public range: Graph['xRange'],
    ) {
        this.handle = availableHandle++;
    }

    public downloadBulk(...obj: { source: string, id: string, variants?: string[] }[]) {
        this.bulkDownload.push(...obj);
        return this;
    }

    public createOperation(obj: OpTrace[] | OpTrace) {
        if (Array.isArray(obj)) {
            this.ops.push(...obj);
        } else {
            this.ops.push(obj);
        }

        return this;
    }

    public relate(...ids: Graph['id'][]) {
        this.relatedGraphs.push(...ids);
        return this;
    }

    public invoke(): Promise<DataJobResult> {
        return dataWorker.invokeDataJob(this);
    }
}

export default DataJob;