import * as React from 'react';
import { AutoSizer, List, ListRowProps } from 'react-virtualized';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAngleRight, faAngleDown } from '@fortawesome/free-solid-svg-icons';

import './SourceTree.css';

class SourceTree
extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);

        this.state = {
            tree: this.calculateTree(props.sources), selected: [],
        };
    }

    calculateTree = (sources: DataSource[]): Leaf[] => sources.map(s => ({
        id: s.id,
        name: s.name,
        level: 0,
        children: s.datasets.map(d => ({
            id: `${s.id}:${d.id}`,
            name: d.name,
            level: 1,
            children: d.variants ? d.variants.map(v => ({
                id: `${s.id}:${d.id}:${v}`,
                name: v,
                level: 2,
            })) : undefined,
        }))
    }))

    public componentDidUpdate(prevProps: Props) {
        if (prevProps.sources !== this.props.sources) {
            this.setState({
                tree: this.calculateTree(this.props.sources),
                selected: [],
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
                ...row.children,
                ...this.state.tree.slice(rowIdx + 1)
            ];

            this.setState({ tree });
        }
    }

    onCheck = (event: React.ChangeEvent<HTMLInputElement>) => {
        const id = event.currentTarget.dataset.id ?? '';
        const row = this.state.tree.find(r => r.id === id);

        if (!row) { return; }

        const idx = this.state.selected.indexOf(row.id);
        const fltr = [ row.id, ...this.selectChildren(row) ]

        if (idx >= 0) {
            this.setState({ selected: [ ...this.state.selected.filter(r => fltr.indexOf(r) < 0) ] });
        } else {
            this.setState({ selected: [ ...this.state.selected, ...fltr.filter(r => this.state.selected.indexOf(r) < 0) ]});
        }

        // TODO:
        // this.props.onChange && this.props.onChange(this.state.)
    }

    rowRenderer = (props: ListRowProps): React.ReactNode => {
        const row = this.state.tree[props.index];
        const selected = this.state.selected.indexOf(row.id) >= 0;

        return (
            <div key={props.key} style={props.style} className={`src-tree-row-${row.level}`}>
                {row.children?.length ? (
                    <span className='btn-expand' onClick={this.onExpandToggle} data-id={row.id}><FontAwesomeIcon icon={row.expanded ? faAngleDown : faAngleRight} /></span>
                ) : (
                    <span className='btn-expand disabled'></span>
                )}
                <input type='checkbox' className='btn-select' checked={selected} data-id={row.id} onChange={this.onCheck}/>
                {row.name}
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
                />
            )}
            </AutoSizer>
        );
    }
}

export interface Props {
    sources: DataSource[];
    onChange?(traces: NodeDescriptor[]): void;
}

type Leaf = { id: string, name: string, level: number, children?: Leaf[], expanded?: boolean, node?: NodeDescriptor };
export interface State {
    tree: Leaf[];
    selected: string[];
}

export default SourceTree;