
export function splitTraceId(trace: string | Pick<Trace, 'id'>): [ string, string | undefined, string | undefined ] {
    if (typeof trace === 'object') {
        trace = trace.id;
    }

    const split = trace.split('::');

    if (split.length < 2) return [ split[0], undefined, undefined];
    if (split.length < 3) return [ split[0], split[1], undefined];

    return [ split[0], split[1], split[2] ];
}

export function isHomogenous(traces: Pick<Trace, 'id'>[]): [ string, string ] | false {
    if (traces.length <= 0 || traces[0].id.indexOf('::') < 0) return false;

    const prefix = traces[0].id.substr(0, traces[0].id.lastIndexOf('::') + 2);

    if (!traces.some(t => !t.id.startsWith(prefix))) {
        const [ source, dataset ] = splitTraceId(traces[0]);

        return [ source, dataset as string ];
    }

    return false;
}
