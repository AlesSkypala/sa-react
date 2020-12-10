interface PipelineRequest {
    from: any,
    to: any,

    pipelines: NodeDescriptor[],
}

interface PipelineSpecs {
    xType: string,
    yType: string,
}

type NodeDescriptor = DataNodeDescriptor | PipeDescriptor;

interface DataNodeDescriptor {
    type: 'data',
    dataset: {
        source: string,
        id: string,
        variant?: string,
    }
}

type PipeDescriptor = DiffPipe | ExprPipe | SumPipe | AvgPipe;

type DiffPipe = OneChildPipe<'diff', {}>;
type ExprPipe = OneChildPipe<'expr', { expression: string }>;
type SumPipe = ManyChildPipe<'sum', undefined>;
type AvgPipe = ManyChildPipe<'avg', undefined>;

interface OneChildPipe<T extends string, O> {
    type: T;
    options: O;

    child: NodeDescriptor;
}

interface ManyChildPipe<T extends string, O> {
    type: T;
    options: O;

    children: NodeDescriptor[];
}