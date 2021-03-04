interface Graph {
    id: number;

    // Appearance
    title: string;
    xLabel: string;
    yLabel: string;
    margin?: 0 | 1 | 2 | 3;

    // Functionality
    xType?: string;
    xRange: [ unknown, unknown ];
    traces: Trace[];

    // Runtime
    zoom?: [ [Date, Date] | undefined, [ unknown, unknown ] | undefined ];
    activeTraces: Trace['id'][];
}

interface Trace {
    id: string;
    title: string;
    
    filtering?: 'sg';
    pipeline: NodeDescriptor;
}

type TraceAction = 'sel-unq' | 'sel-all' | 'inv' | 'des' | 'tres' |
    'sort' | 'filter' | 'search' | 'sum' | 'avg' |
    'del-zero' | 'del-sel' | 'del-unsel' |
    'name-sync' | 'zoom-sync' | 'bind-sync';