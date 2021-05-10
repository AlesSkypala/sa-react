import { faAngleDown, faAngleRight } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as React from 'react';
import { t } from '../locale';

import './DatasetTree.css';

export interface Props {
    className?: string;

    source: DataSource;
    selected: Dataset['id'][];
    disabled?: boolean;

    onChange?(newsel: Props['selected']): void;
}

type Leaf = {
    icon?: string;
    val?: Dataset['id'];
    text: string;
    children?: Leaf[];
    expanded?: boolean;
}

export interface State {
    tree: Leaf[];
}

class DatasetTree extends React.Component<Props, State> {
    public state: State = {
        tree: [],
    }

    public componentDidMount() {
        this.buildTree(this.props);
    }

    public componentDidUpdate(prevProps: Props) {
        if (this.props.source !== prevProps.source) {
            this.buildTree(this.props);
        }
    }

    private buildTree = ({ source }: Props) => {
        const tree: Leaf[] = [];

        const categories: { [cat: string]: Leaf } = {};

        for (const set of source.datasets) {
            const cat = set.category.join('::');
            const leaf: Leaf = {
                val: set.id,
                text: set.id,
            };

            if (!cat) {
                tree.push(leaf);
            } else {
                if (!(cat in categories)) {
                    let lvlCat = '';
                    let prevLevel: Leaf[] = tree;
                    for (const lvl of set.category) {
                        lvlCat += lvlCat === '' ? lvl : `::${lvl}`;

                        if (!(lvlCat in categories)) {
                            prevLevel.push(categories[lvlCat] = {
                                text: lvlCat,
                                children: [],
                            });
                        }

                        prevLevel = categories[lvlCat].children ?? prevLevel;
                    }
                }

                categories[cat].children?.push(leaf);
            }
        }

        this.setState({ tree });
    }

    private leafClicked = (isCat: boolean, _val: string, e: React.MouseEvent<HTMLElement>) => {
        if (!this.props.onChange) return;

        const val = isCat ? undefined : _val;
        const cat = isCat ? _val : undefined;
        const vals: Dataset['id'][] = [];

        if (cat) {
            const cats = cat.split('::');
            const isInCat = (set: Dataset) => {
                return set.category.length >= cats.length && cats.findIndex((c, i) => set.category[i] !== c) < 0;
            };
            
            vals.push(...this.props.source.datasets.filter(ds => isInCat(ds)).map(ds => ds.id));
        } else if (val) {
            vals.push(val);
        } else {
            return;
        }

        if (e.ctrlKey) {
            const set = new Set(this.props.selected);
            if (vals.findIndex(v => !set.has(v)) >= 0) {
                vals.forEach(val => set.add(val));
            } else {
                vals.forEach(val => set.delete(val));
            }
            this.props.onChange([ ...set ]);
        } else {
            if (vals.length === this.props.selected.length && !vals.some(v => !this.props.selected.includes(v))) {
                this.props.onChange([ ]);
            } else {
                this.props.onChange([ ...vals ]);
            }
        }
    }

    public render() {
        const { className, disabled, source, selected } = this.props;
        const { tree } = this.state;

        return (
            <div className={`dstree ${disabled ? 'disabled' : ''} ${className ?? ''}`}>
                {tree.map((leaf, i) => (
                    <LeafComponent
                        {...leaf}
                        key={i}
                        source={source}
                        selected={selected}
                        onToggle={this.leafClicked}
                    />))}
            </div>
        );
    }
}

class LeafComponent extends React.Component<Leaf & { source: DataSource, selected: string[], onToggle?(cat: boolean, val: string, e: React.MouseEvent<HTMLElement>): void }, { expanded: boolean }> {
    public state = {
        expanded: false,
    };

    private onClick = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();

        const { val, text, onToggle } = this.props;

        if (onToggle) {
            onToggle(!val, val ?? text, e);
        }
    };

    private toggleExpand = (e: React.MouseEvent<HTMLElement>) => {
        e.stopPropagation();
        this.props.children && this.setState({ expanded: !this.state.expanded });
    }

    getTitle = (sourceType: DataSource['type'], id: Dataset['id']) => {
        if (sourceType === 'hp') {
            let match;

            if ((match = id.match(/([\w_]+_MPU)-(\d+)$/))) {
                return t(`datasets.titles.hp.${match[1]}`, id, { val: match[2] });
            }
        }

        return t(`datasets.titles.${sourceType}.${id}`, id);
    }

    isActive = (leaf: Leaf, selected: string[]): boolean => {
        if (leaf.val) return selected.includes(leaf.val);
        if (leaf.children) return leaf.children.findIndex(c => !this.isActive(c, selected)) < 0;

        return false;
    }

    public render() {
        const leaf = this.props as Readonly<Leaf>;
        const { source, selected, onToggle } = this.props;
        const { expanded } = this.state;
        const active = this.isActive(leaf, selected);

        return (
            <div className={`item ${active ? 'active' : ''}`} onClick={this.onClick} key={leaf.val ?? leaf.text} data-val={leaf.val} data-cat={leaf.val ? undefined : leaf.text}>
                <span className='expander' onClick={this.toggleExpand}>{leaf.children && (<FontAwesomeIcon icon={expanded ? faAngleDown : faAngleRight} />)}</span>
                <span className='label'>{this.getTitle(this.props.source.type, leaf.text)}</span>
                {leaf.children?.length && expanded && (
                    <div className='children'>{leaf.children.map((l, i) => (
                        <LeafComponent
                            {...l}
                            key={i}
                            source={source}
                            selected={selected}
                            onToggle={onToggle}
                        />
                    ))}</div>
                )}
            </div>
        );
    }
}

export default DatasetTree;