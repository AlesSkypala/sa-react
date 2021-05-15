import { toLdevInternal, toLdevInternalFromVariant } from '../utils/ldev';
import { splitTraceId } from '../utils/trace';

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

    public getVariantRecommendation = async (sourceId: string, id: string, range: [unknown, unknown]): Promise<string[]> => {
        const source = (await this.getSources()).find(s => s.id === sourceId);

        if (!source || !source.features.includes('variant_recommend')) {
            return await this.getTraceVariants({ source: sourceId, id });
        }
        
        return  await (await fetch(
            this.getApiPath('data', sourceId, 'features', 'variant_recommend'),
            {
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id, from: String(range[0]), to: String(range[1]) }),
                method: 'post'
            }
        )).json();
    }
  
    public getLdevMap = async (source: string, ids: string[], mode: LdevMapMode): Promise<LdevInfo[]> => {
        return  await (await fetch(
            this.getApiPath('data', source, 'features', 'ldev_map'),
            {
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ids, mode }),
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

    public hasLdevMap = (id: Trace['id']): boolean => {
        const split = id.split('::');
        if (!this.sources || split.length < 3) return false;
        const [ sourceId, setid ] = split;

        const source = this.sources.find(s => s.id === sourceId);
        const set = source?.datasets.find(ds => ds.id === setid);

        return (source?.features.includes('ldev_map') ?? false) && (set?.id.startsWith('LDEV_') ?? false);
    }

    public getCompleteLdevMap = async (traces: Trace[]): Promise<{ [source: string]: LdevInfo[] }> => {
        const queue: { [key: string]: string[] } = {};
        const sources = await this.getSources();

        traces.forEach(t => {
            const [ source, dataset, variant ] = splitTraceId(t);

            if (!dataset || !variant || !dataset.startsWith('LDEV_')) return;

            if (!(source in queue)) {
                if (sources.find(s => s.id === source)?.features.includes('ldev_map') ?? false) {
                    queue[source] = [];
                } else {
                    return;
                }
            }

            queue[source].push(toLdevInternalFromVariant(variant, 'ldev'));
        });

        const result: { [source: string]: LdevInfo[] } = {};
        for (const source in queue) {
            result[source] = await this.getLdevMap(source, queue[source], 'ldev');
        }

        return result;
    }

    public getHomogenousLdevMap = async (traces: Pick<Trace, 'id'>[], mode: LdevMapMode): Promise<LdevInfo[]> => {
        if (traces.length < 0) return [];

        const source = splitTraceId(traces[0].id)[0];

        return this.getLdevMap(source, traces.map(t => toLdevInternal(t, mode)), mode);
    }
}

const _instance = new Data();
export default _instance;