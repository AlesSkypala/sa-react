import { Md5 } from "ts-md5";
import TraceData from "./TraceData";

class Data {
    private sources: DataSource[] | undefined = undefined;
    private dataCache: { [hash: string]: { specs: PipelineSpecs, loadedSegments: [ any, any, ArrayBuffer ][] } } = {};


    private getApiPath = (...segments: string[]) => '/api/v2/' + segments.join('/');
  
    public getSources = async () => {
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
  
    public getTraceData = async (from: any, to: any, traces: Trace[]): Promise<TraceData[]> => {
  
      const cached = traces.filter(t => {
        const h = this.getTraceHash(t);
        return this.dataCache[h] && this.dataCache[h].loadedSegments.some(seg => seg[0] <= from && seg[1] >= to);
      });
      const uncached = traces.filter(t => !cached.includes(t));
  
      if (uncached.length > 0)
      {
        const specs = await this.getPipelineSpecs({ pipelines: uncached.map(t => t.pipeline) } as PipelineRequest);
        const data = await this.getPipelineData({
          pipelines: uncached.map(t => t.pipeline), from: String(from), to: String(to),
        });
  
        {
          const view = new DataView(data);
          let cursor = 0;
          for (let tIdx = 0; tIdx < uncached.length; ++tIdx)
          {
            const hash = this.getTraceHash(uncached[tIdx]);
            const cacheEntry = this.dataCache[hash] || (this.dataCache[hash] = {
              specs: specs[tIdx],
              loadedSegments: []
            });
  
            const blockLength = view.getInt32(cursor, true);
            cacheEntry.loadedSegments.push([
              from,
              to,
              data.slice(cursor + 4, cursor + 4 + blockLength)
            ]);
            // TODO: segment merging
  
            cursor += 4 + blockLength;
          }
        }
      }
  
      return traces.map(t => {
        const entry = this.dataCache[this.getTraceHash(t)];
        const segment = entry.loadedSegments.find(seg => from >= seg[0] && to <= seg[1]);
  
        // TODO: view narrowing
        return new TraceData(t, entry.specs, new DataView(segment![2]));
      });
    }
  
    public getTraceHash = (trace: Trace & { hash?: string }) => {
      return trace.hash || (trace.hash = Md5.hashStr(JSON.stringify(trace.pipeline), false) as string);
    }
}

const _instance = new Data();
export default _instance;