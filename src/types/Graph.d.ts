interface Graph<T extends XType = XType> {
    id: number;

    // Appearance
    title: string;
    xLabel: string;
    yLabel: string;

    style: GraphStyle;

    // Functionality
    xType: T;
    xRange: [ XTypeTypes[T], XTypeTypes[T] ];
    traces: Trace[];

    // Runtime
    zoom?: [ XTypeTypes[T], XTypeTypes[T], number, number ];
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

type DateTimeType = number;
type XType = keyof XTypeTypes;
type XTypeTypes = {
    datetime: DateTimeType,
    bool: boolean,
    byte: number,
    float: number,
    short: number,
    int: number,
    ushort: number,
    uint: number,
}

type TraceAction = 'sel-unq' | 'sel-all' | 'inv' | 'des' | 'tres' |
    'sort' | 'filter' | 'search' | 'sum' | 'avg' |
    'del-zero' | 'del-sel' | 'del-unsel' |
    'name-sync' | 'zoom-sync' | 'bind-sync';