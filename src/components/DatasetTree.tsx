import { faAngleDown, faAngleRight, faChartLine, faCogs, faDatabase, faEyeDropper, faFolder, faHdd, faMemory, faMicrochip, IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as React from 'react';
import { t } from '../locale';

import './DatasetTree.css';

const knownIcons: { [key: string]: { [key: string]: IconDefinition } } = {
    'hp': {
        'LDEV_Short': faDatabase,
        'PhyProc_dat': faMicrochip,
        'PhyMPU_dat': faMemory,
        'PhyProc_Cache_dat': faMemory,
        'PhyESW_dat': faMemory,
        'PhyMainPK_dat': faMemory,
        'PhyCMPK_dat': faMemory,
        'PhyPG_dat': faHdd,
        'Port_dat': faEyeDropper,
        'PhyMPPK_dat': faCogs,
    }
};

export interface Props {
    className?: string;

    source: DataSource;
    selected: Dataset['id'][];
    disabled?: boolean;

    onChange?(newsel: Props['selected']): void;
}

type Leaf = {
    icon?: string;
    text: string;
    level: number;
    value: Dataset['id'] | Leaf[];
}

export interface State {
    tree: { nodes: Leaf[], levels: Leaf[][] };
}

class DatasetTree extends React.Component<Props, State> {
    public state: State = {
        tree: { nodes: [], levels: [] },
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
        const nodes: Leaf[] = [];
        const levels: Leaf[][] = [];

        const categories: { [cat: string]: Leaf } = {};

        for (const set of source.datasets) {
            const cat = set.category.join('::');
            const leaf: Leaf = {
                value: set.id,
                text: set.id,
                level: -1,
            };

            if (!cat) {
                nodes.push(leaf);
            } else {
                if (!(cat in categories)) {
                    let lvlCat = '';
                    let prevLevel: Leaf[] = nodes;
                    for (const lvl of set.category) {
                        lvlCat += lvlCat === '' ? lvl : `::${lvl}`;

                        if (!(lvlCat in categories)) {
                            prevLevel.push(categories[lvlCat] = {
                                text: lvlCat,
                                value: [],
                                level: -1,
                            });
                        }

                        prevLevel = categories[lvlCat].value as Leaf[];
                    }
                }

                (categories[cat].value as Leaf[]).push(leaf);
            }
        }

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const createLevel = (level: Leaf[]) => level.filter(l => Array.isArray(l.value)).flatMap(l => l.value as Leaf[]);

        nodes.forEach(n => n.level = 0);
        levels.push(nodes);
        
        for (let levelIdx = 1, level = createLevel(nodes); level.length > 0; ++levelIdx) {
            level.forEach(n => n.level = levelIdx);
            levels.push(level);
            
            level = createLevel(level);
        }

        this.setState({ tree: { nodes, levels } });
    }

    prevClick: Leaf | undefined;

    private leafClicked = (leaf: Leaf, e: React.MouseEvent<HTMLElement>) => {
        if (!this.props.onChange) return;

        const collectValues = (leaf: Leaf): string[] => Array.isArray(leaf.value) ? leaf.value.flatMap(v => collectValues(v)) : [ leaf.text ];
        let vals: Dataset['id'][];

        if (e.shiftKey) {
            if (!this.prevClick || this.prevClick.level !== leaf.level) return;

            const level = this.state.tree.levels[leaf.level];

            const prevIdx = level.indexOf(this.prevClick);
            const nextIdx = level.indexOf(leaf);

            vals = level.slice(Math.min(prevIdx, nextIdx), Math.max(prevIdx, nextIdx) + 1).flatMap(v => collectValues(v));

        } else {
            vals = collectValues(leaf);
            this.prevClick = leaf;
        }

        if (e.ctrlKey) {
            const set = new Set(this.props.selected);
            if (vals.some(v => !set.has(v))) {
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
        const { nodes } = this.state.tree;

        return (
            <div className={`dstree ${disabled ? 'disabled' : ''} ${className ?? ''}`}>
                {nodes.map((leaf, i) => (
                    <LeafComponent
                        key={i}
                        leaf={leaf}
                        source={source}
                        selected={selected}
                        onToggle={this.leafClicked}
                    />))}
            </div>
        );
    }
}

type LeafProps = {
    leaf: Leaf,
    source: DataSource,
    selected: string[],
    
    onToggle?(leaf: Leaf, e: React.MouseEvent<HTMLElement>): void
}

class LeafComponent extends React.Component<LeafProps, { expanded: boolean }> {
    public state = {
        expanded: false,
    };

    private onClick = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();

        const { onToggle } = this.props;

        if (onToggle) {
            onToggle(this.props.leaf, e);
        }
    };

    private toggleExpand = (e: React.MouseEvent<HTMLElement>) => {
        e.stopPropagation();
        Array.isArray(this.props.leaf.value) && this.setState({ expanded: !this.state.expanded });
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

    getIcon = (sourceType: DataSource['type'], leaf: Leaf): IconDefinition => {
        if (!Array.isArray(leaf.value)) {
            return faChartLine;
        }

        if (sourceType in knownIcons && leaf.text in knownIcons[sourceType]) {
            return knownIcons[sourceType][leaf.text];
        }

        return faFolder;
    }


    isActive = (leaf: Leaf, selected: string[]): boolean => {
        if (!Array.isArray(leaf.value)) return selected.includes(leaf.value);
        return !leaf.value.some(c => !this.isActive(c, selected));
    }

    public render() {
        const { leaf, source, selected, onToggle } = this.props;
        const { expanded } = this.state;
        const active = this.isActive(leaf, selected);
        const title = this.getTitle(this.props.source.type, leaf.text);
        const hasChildren = Array.isArray(leaf.value);

        return (
            <div className={`item ${active ? 'active' : ''}`} onClick={this.onClick} key={leaf.text} title={title}>
                <span className='expander' onClick={this.toggleExpand}>{hasChildren && (<FontAwesomeIcon icon={expanded ? faAngleDown : faAngleRight} />)}</span>
                <FontAwesomeIcon className='icon ml-1 mr-2' icon={this.getIcon(this.props.source.type, leaf)} />
                <span className='label'>{title}</span>
                {hasChildren && expanded && (
                    <div className='children'>{(leaf.value as Leaf[]).map((l, i) => (
                        <LeafComponent
                            leaf={l}
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