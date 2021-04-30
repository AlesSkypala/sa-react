
export function splitTraceId(trace: string | Pick<Trace, 'id'>): [ string, string | undefined, string | undefined ] {
    if (typeof trace === 'object') {
        trace = trace.id;
    }

    const split = trace.split('::');

    if (split.length < 2) return [ split[0], undefined, undefined];
    if (split.length < 3) return [ split[0], split[1], undefined];

    return [ split[0], split[1], split[2] ];
}
