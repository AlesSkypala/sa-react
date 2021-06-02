interface Graph<T extends XType = XType> {
    id: string;

    // Appearance
    visible: boolean;
    title: string;
    xLabel: string;
    yLabel: string;

    metadata: GraphMetadata;
    style: GraphStyle;

    // Functionality
    xType: T;
    xRange: [ XTypeTypeMap[T], XTypeTypeMap[T] ];
    traces: Trace[];

    // Runtime
    zoom?: [ XTypeTypeMap[T], XTypeTypeMap[T], number, number ];
}

interface GraphMetadata {
    units: string[];
    datasetNames: string[];
    sourceNames: string[];
}

interface GraphStyle {
    margin: number;
    xLabelSpace: number;
    yLabelSpace: number;
}

interface Trace {
    id: string;
    rev: number;
    handle: number;
    title: string;
    style: TraceStyle;
    active: boolean;

    // features: string[];
    filtering?: 'sg';
    // pipeline: NodeDescriptor;
}

interface TraceStyle {
    color: [number, number, number];
    width: number;
}

type TraceMetas = {
    handle: number,
    avg: number,
    min: number,
    max: number,
}

type DateTimeType = number;
type XType = keyof XTypeTypeMap;
type XTypeTypeMap = {
    datetime: DateTimeType,
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

type StackingType = 'horizontal' | 'vertical' | 'grid' | 'freeform';

type RulerData = { xType: Graph['xType'], value: Graph['xRange'][0] };

type Filter = (t: Trace) => boolean;
type Sorter = (a: Trace, b: Trace) => number;
