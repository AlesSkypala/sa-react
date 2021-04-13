import { dataWorker } from '..';

let availableHandle = 0;

class DataJob {
    private _handle = -1;

    public get handle() { return this._handle; }

    public relatedGraphs: Graph['id'][] = [];
    public bulkDownload: { source: string, id: string, variants?: string[] }[] = [];
    // public pipelineDownload: { pipe }[] = [];

    constructor(
        public range: Graph['xRange'],
    ) {
        this._handle = availableHandle++;
    }

    public downloadBulk(...obj: { source: string, id: string, variants?: string[] }[]) {
        this.bulkDownload.push(...obj);
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