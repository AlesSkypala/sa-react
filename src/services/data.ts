class Data {
    private sources: DataSource[] | undefined = undefined;

    private getApiPath = (...segments: string[]) => '/api/v2/' + segments.join('/');
  
    public getSources = async (): Promise<DataSource[]> => {
        if (this.sources) {
            return this.sources;
        }
  
        return this.sources = await (await fetch(this.getApiPath('data'))).json();
    }
  
    public getPipelineSpecs = async (pipeline: PipelineRequest) => {
        return await (await fetch(
            this.getApiPath('data', 'specs'),
            {
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(pipeline),
                method: 'post'
            }
        )).json();
    }
  
    public getPipelineData = async (request: PipelineRequest): Promise<ArrayBuffer> => {
        return await (await fetch(
            this.getApiPath('data'),
            {
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(request),
                method: 'post'
            }
        )).arrayBuffer();
    }
  
    public getLdevMap = async (source: string, ldev: string): Promise<LdevInfo> => {
        return await (await fetch(
            this.getApiPath('data', source, 'features', 'ldev_map'),
            {
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id: ldev }),
                method: 'post'
            }
        )).json();
    }

    public getTraceVariants = async (dataset: { source: string, id: string }): Promise<string[]> => {
        const { source, id } = dataset;

        return await (await fetch(
            this.getApiPath('data', source, id, 'variants'),
            {
                headers: {
                    'Content-Type': 'application/json'
                },
                method: 'get'
            }
        )).json();
    }

    public getBulkData = async (trace: Pick<Dataset, 'source' | 'id'> & { variants?: string[] }, range: [ unknown, unknown ]): Promise<[ string[], ArrayBuffer ]> => {

        const vars = trace.variants ?? await this.getTraceVariants(trace);

        return [
            vars,
            await (await fetch(
                this.getApiPath('data', trace.source, trace.id, 'bulk'),
                {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    method: 'post',
                    body: JSON.stringify({ from: String(range[0]), to: String(range[1]), variants: trace.variants })
                }
            )).arrayBuffer()
        ];
    }
}

const _instance = new Data();
export default _instance;