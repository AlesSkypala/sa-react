interface Graph {
    id: number;

    // Appearance
    title: string;
    xLabel: string;
    yLabel: string;

    style: GraphStyle;

    // Functionality
    xType?: string;
    xRange: [ unknown, unknown ];
    traces: Trace[];

    // Runtime
    zoom?: [ unknown, unknown, number, number ];
    activeTraces: Trace['id'][];
}

interface GraphStyle {
    margin: number;
    xLabelSpace: number;
    yLabelSpace: number;
}

interface Trace {
    id: string;
    title: string;

    style?: TraceStyle;
    
    filtering?: 'sg';
    pipeline: NodeDescriptor;
}

interface TraceStyle {
    color: [number, number, number];
    width: number;
}

type TraceAction = 'sel-unq' | 'sel-all' | 'inv' | 'des' | 'tres' |
    'sort' | 'filter' | 'search' | 'sum' | 'avg' |
    'del-zero' | 'del-sel' | 'del-unsel' |
    'name-sync' | 'zoom-sync' | 'bind-sync';