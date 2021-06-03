import { faAngleDown, faAngleRight, faChartLine, faCogs, faDatabase, faEyeDropper, faFolder, faHdd, faMemory, faMicrochip, IconDefinition, faStar } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as React from 'react';
import { connect } from 'react-redux';
import { t } from '../locale';
import { favorite_dataset, ReduxProps, unfavorite_dataset } from '../redux';
import { rangeIntersectsBounds } from '../utils/datetime';

import './DatasetTree.scss';

const expandStore: { [key: string]: string[] } = {};


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

const stateProps = (store: RootStore) => ({
    favorites: store.settings.favoriteDatasets
});

const dispatchProps = {
    favorite_dataset,
    unfavorite_dataset,
};

export interface Props extends ReduxProps<typeof stateProps, typeof dispatchProps> {
    className?: string;

    source: DataSource;
    selected: Dataset['id'][];
    disabled?: boolean;
    dataRange: [number, number];

    storeId?: string;

    onChange?(newsel: Props['selected']): void;
    onDoubleClick?(target: Dataset['id']): void;
}

type Leaf = {
    text: string[];

    level: number;
    idx: number;

    cat?: string;
    value: Dataset | Leaf[];
}

export interface State {
    tree: { nodes: Leaf[], levels: Leaf[][] };
    expanded: string[];
}

class DatasetTree extends React.Component<Props, State> {
    public state: State = {
        tree: { nodes: [], levels: [] },
        expanded: [],
    }

    public componentDidMount() {
        this.buildTree(this.props);

        if (this.props.storeId && this.props.storeId in expandStore) {
            this.setState({ expanded: expandStore[this.props.storeId] });
        }
    }

    public componentWillUnmount() {
        if (this.props.storeId) {
            expandStore[this.props.storeId] = [ ...this.state.expanded ];
        }
    }

    public componentDidUpdate(prevProps: Props) {
        if (this.props.source !== prevProps.source || this.props.dataRange !== prevProps.dataRange) {
            this.buildTree(this.props);
            this.props.source !== prevProps.source && this.setState({ expanded: [] });
        } else if (this.props.favorites !== prevProps.favorites) {
            // eslint-disable-next-line react/no-direct-mutation-state
            this.state.tree.nodes[0].value = this.generateFavoriteLeaves();
            // eslint-disable-next-line react/no-direct-mutation-state
            this.state.tree.levels[1] = this.state.tree.levels[0].filter(l => Array.isArray(l.value)).flatMap(l => l.value as Leaf[]);
            this.forceUpdate();
        }
    }

    private getIntersecting = (sets: Dataset[]): Dataset[] => sets.filter(d => rangeIntersectsBounds(this.props.dataRange, d.dataRange as [number, number][]))

    private generateFavoriteLeaves = (): Leaf[] => {
        const { source, favorites } = this.props;

        return this.getIntersecting(source.datasets)
            .filter(d => favorites.some(f => f.id === d.id && source[f.per] === f.source))
            .map((d, i) => ({
                value: d,
                text: [ ...d.category, d.id ],
                level: 1,
                idx: i
            }));
    }

    private buildTree = ({ source }: Props) => {
        const nodes: Leaf[] = [];
        const levels: Leaf[][] = [];

        const categories: { [cat: string]: Leaf } = {};

        nodes.push(categories['favorites'] = {
            cat: 'favorites',
            value: this.generateFavoriteLeaves(),
            text: [ 'favorites' ],
            level: -1,
            idx: 0,
        });

        for (const set of this.getIntersecting(source.datasets)) {
            const cat = set.category.join('::');
            const leaf: Leaf = {
                value: set,
                text: [ set.id ],
                level: -1,
                idx: -1,
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
                                text: [ lvl ],
                                cat: lvlCat,
                                value: [],
                                level: -1,
                                idx: -1,
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
            level.forEach((n, i) => { n.level = levelIdx; n.idx = i; });
            levels.push(level);
            
            level = createLevel(level);
        }

        this.setState({ tree: { nodes, levels } });
    }

    prevClick: Leaf | undefined;

    private leafClicked = (leaf: Leaf, e: React.MouseEvent<HTMLElement>) => {
        if (!this.props.onChange) return;

        const collectValues = (leaf: Leaf): string[] => Array.isArray(leaf.value) ? leaf.value.flatMap(v => collectValues(v)) : (leaf.value ? [ leaf.value.id ] : []);
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

    private leafDoubleClicked = (leaf: Leaf) => {
        if (!Array.isArray(leaf.value) && this.props.onDoubleClick) {
            this.props.onDoubleClick(leaf.value.id);
        }
    }

    private leafFavorite = (leaf: Leaf, value: boolean) => {
        if (Array.isArray(leaf.value)) return;
        const { id } = leaf.value;

        if (value) {
            this.props.unfavorite_dataset([ { per: 'type', source: this.props.source.type, id } ]);
        } else {
            this.props.favorite_dataset([ { per: 'type', source: this.props.source.type, id } ]);
        }
    };

    private leafExpand = (leaf: Leaf) => {
        if (!leaf.cat) { return; }

        let catIdx: number;

        if ((catIdx = this.state.expanded.indexOf(leaf.cat)) >= 0) {
            const expanded = [ ...this.state.expanded ];
            expanded.splice(catIdx, 1);

            this.setState({ expanded });
        } else {
            this.setState({ expanded: [ ...this.state.expanded, leaf.cat ] });
        }
    }

    public render() {
        const { className, disabled, source, selected } = this.props;
        const { nodes } = this.state.tree;

        return (
            <div className={`dstree ${disabled ? 'disabled' : ''} ${className ?? ''}`}>
                {nodes.map(leaf => (
                    <LeafComponent
                        key={leaf.cat ? leaf.cat : (leaf.value as Dataset).id}
                        leaf={leaf}
                        source={source}
                        selected={selected}
                        favorites={this.props.favorites}
                        expanded={this.state.expanded}

                        onToggle={this.leafClicked}
                        onDoubleClick={this.leafDoubleClicked}
                        onFavoriteToggle={this.leafFavorite}
                        onExpand={this.leafExpand}
                    />))}
            </div>
        );
    }
}

type LeafProps = {
    leaf: Leaf,
    source: DataSource,
    selected: string[],
    favorites: Props['favorites'];
    expanded: State['expanded'];
    
    onToggle?(leaf: Leaf, e: React.MouseEvent<HTMLElement>): void;
    onDoubleClick?(leaf: Leaf, e: React.MouseEvent<HTMLElement>): void;
    onFavoriteToggle?(leaf: Leaf, value: boolean): void;
    onExpand?(leaf: Leaf): void;
}

class LeafComponent extends React.Component<LeafProps> {
    private onClick = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();

        const { onToggle } = this.props;

        if (onToggle) {
            onToggle(this.props.leaf, e);
        }
    };

    private toggleExpand = (e: React.MouseEvent<HTMLElement>) => {
        e.stopPropagation();
        Array.isArray(this.props.leaf.value) && this.props.onExpand && this.props.onExpand(this.props.leaf);
    }

    getTitle = (sourceType: DataSource['type'], id: Dataset['id']) => {
        if (id === 'favorites' && Array.isArray(this.props.leaf.value)) return t('datasets.favorites');

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

        const text = leaf.text[leaf.text.length - 1];

        if (sourceType in knownIcons && text in knownIcons[sourceType]) {
            return knownIcons[sourceType][text];
        }

        if (leaf.cat === 'favorites') return faStar;

        return faFolder;
    }

    isActive = (leaf: Leaf, selected: string[]): boolean => {
        if (!Array.isArray(leaf.value)) return selected.includes(leaf.value.id);
        return leaf.value.length > 0 && !leaf.value.some(c => !this.isActive(c, selected));
    }

    onDoubleClick = (e: React.MouseEvent<HTMLElement>) => {
        this.props.onDoubleClick && this.props.onDoubleClick(this.props.leaf, e);
    }

    getDescription = (sourceType: DataSource['type'], id: Trace['id']) => {
        const result = t(`datasets.descriptions.${sourceType}.${id}`, '');

        if (result !== '')
            return result;
        else
            return undefined;
    }

    getTooltip = () => {
        const { source, leaf } = this.props;
        const text = leaf.text[leaf.text.length - 1];
        let tooltip = this.getTitle(source.type, text) + '\n\n';

        if (Array.isArray(leaf.value)) {
            tooltip += `${t('datasets.items', { count: leaf.value.length })}\n`;
        } else {
            if (source.type === 'hp') {
                tooltip += `${t('datasets.path', { path: leaf.value.category.map(c => `${c}.ZIP\\`).join() + leaf.value.id + '.csv' })}\n`;
            } else {
                tooltip += `${t('datasets.id', { id: leaf.value })}\n`;
            }

            const desc = this.getDescription(source.type, leaf.value.id);
            if (desc) tooltip += `Description: ${desc}\n`;
        }


        return tooltip.trimEnd();
    }

    onFavorite = (e: React.MouseEvent) => {
        e.stopPropagation();
        const { leaf } = this.props;

        if (Array.isArray(leaf.value)) return;

        this.props.onFavoriteToggle && this.props.onFavoriteToggle(leaf, this.isFavorite());
    }

    isFavorite = () => {
        const { leaf, favorites, source } = this.props;

        return !Array.isArray(leaf.value) && favorites.some(f => f.id === (leaf.value as Dataset).id && source[f.per] === f.source);
    }

    public render() {
        const { leaf, source, selected, onToggle, onDoubleClick, favorites, expanded } = this.props;
        const active = this.isActive(leaf, selected);
        const title =  leaf.text.map(t => this.getTitle(source.type, t)).join(' > ');
        const tooltip = this.getTooltip();
        const children = Array.isArray(leaf.value) ? leaf.value : undefined;
        const isFavorite = this.isFavorite();

        const isExpanded = leaf.cat && expanded.includes(leaf.cat);

        return (
            <div className={`item ${active ? 'active' : ''}`} onClick={this.onClick} title={tooltip}>
                <div className='item-row'>
                    <span className='expander' onClick={this.toggleExpand}>{children && (<FontAwesomeIcon icon={isExpanded ? faAngleDown : faAngleRight} />)}</span>
                    <FontAwesomeIcon className='icon' icon={this.getIcon(source.type, leaf)} />
                    <span className='label' onDoubleClick={this.onDoubleClick}>{title}</span>
                    {!children && (
                        <FontAwesomeIcon className='fav' icon={faStar} style={{ color: isFavorite ? 'orange' : 'lightgray' }}  onClick={this.onFavorite}/>
                    )}
                </div>
                {children && isExpanded && (
                    <div className='children'>{children.map(l => (
                        <LeafComponent
                            key={l.cat ? l.cat : (l.value as Dataset).id} 
                            leaf={l}
                            source={source}
                            selected={selected}
                            favorites={favorites}
                            expanded={expanded}

                            onToggle={onToggle}
                            onDoubleClick={onDoubleClick}
                            onFavoriteToggle={this.props.onFavoriteToggle}
                            onExpand={this.props.onExpand}
                        />
                    ))}</div>
                )}
            </div>
        );
    }
}

export default connect(stateProps, dispatchProps)(DatasetTree);