import * as React from 'react';
import { AutoSizer, List, ListRowProps } from 'react-virtualized';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAngleRight, faAngleDown, faSquare, faMinusSquare, faCheckSquare } from '@fortawesome/free-solid-svg-icons';

import './SourceTree.css';
import { t } from '../locale';

class SourceTree
    extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);

        const [ tree, map ] = this.generateTreeMap(props.sources);

        this.map = map;
        this.state = {
            tree,
            selected: new Set<string>(),
            revision: 0,
        };
    }
    
    private map: { [key: string]: NodeDescriptor } = {};
    generateTreeMap = (sources: DataSource[]): [Leaf[], { [key: string]: NodeDescriptor }] => {
        const map: { [key: string]: NodeDescriptor } = {};

        return [ 
            sources.map(s => ({
                id: s.id,
                name: s.name,
                level: 0,
                children: s.datasets.map(d => {
                    const id = `${s.id}:${d.id}`;

                    // if (d.variants?.length) {
                    //     for (const variant of d.variants) {
                    //         map[`${id}:${variant}`] = {
                    //             type: 'data',
                    //             dataset: {
                    //                 source: d.source,
                    //                 id: d.id,
                    //                 variant,
                    //             }
                    //         };
                    //     }

                    //     return {
                    //         id,
                    //         name: d.name,
                    //         level: 1,
                    //         children: d.variants.map(v => ({
                    //             id: `${id}:${v}`,
                    //             name: v,
                    //             level: 2,
                    //         })),
                    //     };
                    // }
                    
                    map[id] = {
                        type: 'data',
                        dataset: { source: d.source, id: d.id },
                    };
                    return {
                        id,
                        name: t('datasets.name.' + d.id, d.id),
                        level: 1,
                    };
                })
            })),
            map
        ];
    }

    public componentDidUpdate(prevProps: Props) {
        if (prevProps.sources !== this.props.sources) {
            const [ tree, map ] = this.generateTreeMap(this.props.sources);

            this.map = map;
            this.setState({
                tree,
                selected: new Set<string>(),
            });
        }
    }

    countExpandedChildren = (leaf: Leaf): number => {
        if (!leaf.children || !leaf.expanded) { return 0; }
        return leaf.children.reduce((total, val) => total + 1 + this.countExpandedChildren(val), 0);
    }

    selectChildren = (leaf: Leaf): string[] => {
        if (!leaf.children) { return []; }
        return leaf.children.flatMap(c => [ c.id, ...this.selectChildren(c) ]);
    }

    expandChildren = (leaf: Leaf): Leaf[] => {
        if (!leaf.expanded || !leaf.children) { return []; }
        return leaf.children.flatMap(c => [ c, ...this.expandChildren(c) ]);
    }

    onExpandToggle = (event: React.MouseEvent<HTMLSpanElement>) => {
        const id = event.currentTarget.dataset.id ?? '';
        const rowIdx = this.state.tree.findIndex(r => r.id === id);

        if (rowIdx < 0) { return; }

        const row = this.state.tree[rowIdx];

        if (!row.children || row.children.length <= 0) { return; }
        
        if (row.expanded) {
            const tree = [
                ...this.state.tree.slice(0, rowIdx + 1),
                ...this.state.tree.slice(rowIdx + 1 + this.countExpandedChildren(row))
            ];

            row.expanded = false;

            this.setState({ tree });
        } else {
            row.expanded = true;
            const tree = [
                ...this.state.tree.slice(0, rowIdx + 1),
                ...this.expandChildren(row),
                ...this.state.tree.slice(rowIdx + 1)
            ];

            this.setState({ tree });
        }
    }

    onCheck = (event: React.MouseEvent<HTMLDivElement>) => {
        const id = event.currentTarget.dataset.id ?? '';
        const row = this.state.tree.find(r => r.id === id);

        if (!row) { return; }

        const has = this.state.selected.has(row.id);
        const fltr = [ row.id, ...this.selectChildren(row) ];

        if (has) {
            for (const k of fltr) { this.state.selected.delete(k); }
        } else {
            for (const k of fltr) { this.state.selected.add(k); }
        }
        this.setState({ revision: this.state.revision + 1 });

        if (this.props.onChange) {
            const nodes: NodeDescriptor[] = [];
            const iterator = this.state.selected.values();
            
            for (let result = iterator.next(); !result.done; result = iterator.next()) {
                if (result.value in this.map) {
                    nodes.push(this.map[result.value]);
                }
            }

            this.props.onChange(nodes);
        }
    }

    rowRenderer = (props: ListRowProps): React.ReactNode => {
        const row = this.state.tree[props.index];
        const selected = this.state.selected.has(row.id);
        let indeterminate = false;

        if (!selected && row.children?.length) {
            indeterminate = !!this.selectChildren(row).find(c => this.state.selected.has(c));
        }

        return (
            <div key={props.key} style={props.style} className={`src-tree-row-${row.level}`}>
                {row.children?.length ? (
                    <span className='btn-expand' onClick={this.onExpandToggle} data-id={row.id}><FontAwesomeIcon icon={row.expanded ? faAngleDown : faAngleRight} /></span>
                ) : (
                    <span className='btn-expand disabled'></span>
                )}
                
                <span className='btn-select' data-id={row.id} onClick={this.onCheck}>
                    <FontAwesomeIcon icon={selected ? faCheckSquare : (indeterminate ? faMinusSquare : faSquare)} />
                </span>
                <span data-id={row.id} onClick={this.onCheck}>
                    {row.name}
                </span>
            </div>
        );
    }

    public render() {
        return (
            <AutoSizer>
                {({width, height}) => (
                    <List
                        width={width}
                        height={height}
                        rowCount={this.state.tree.length}
                        rowHeight={24}
                        rowRenderer={this.rowRenderer}
                    
                        selected={this.state.selected}
                        revision={this.state.revision}
                    />
                )}
            </AutoSizer>
        );
    }
}

export interface Props {
    sources: DataSource[];
    onChange?(nodes: NodeDescriptor[]): void;
}

type Leaf = { id: string, name: string, level: number, children?: Leaf[], expanded?: boolean };
export interface State {
    tree: Leaf[];

    selected: Set<string>;
    revision: number;
}

export default SourceTree;