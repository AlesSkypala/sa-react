import React from 'react';
import debounce from 'lodash.debounce';
import { connect, ReduxProps, graph_action } from '../redux';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconDefinition, faTimes, faFilter, faSortAlphaDown, faSortAlphaUpAlt, faSortAmountDown, faSortAmountUpAlt } from '@fortawesome/free-solid-svg-icons';

import './TraceSearchBar.scss';


enum SortingState {
    LexicalAsc,
    LexicalDesc,
    AverageAsc,
    AverageDesc,
}

const sortingIcon: { [s in SortingState]: IconDefinition } = {
    [SortingState.LexicalAsc]: faSortAlphaDown,
    [SortingState.LexicalDesc]: faSortAlphaUpAlt,
    [SortingState.AverageAsc]: faSortAmountDown,
    [SortingState.AverageDesc]: faSortAmountUpAlt,
};

function reverseSortingStateDirection(sorting: SortingState) {
    switch (sorting) {
        case SortingState.AverageAsc:
            return SortingState.AverageDesc;

        case SortingState.AverageDesc:
            return SortingState.AverageAsc;

        case SortingState.LexicalAsc:
            return SortingState.LexicalDesc;

        case SortingState.LexicalDesc:
            return SortingState.LexicalAsc;
    }
}


const storeProps = (state: RootStore) => ({
    graphs: state.graphs.items,
    focused: state.graphs.focused,
});

const dispatchProps = {
    graph_action,
};

interface Props extends ReduxProps<typeof storeProps, typeof dispatchProps> {
    onFilter: (fn: Filter | undefined) => void;
    onSort: (fn: Sorter | undefined) => void;
}

interface State {
    searchString: string;
    sortingState: SortingState;
}

class TraceSearchRow extends React.Component<Props, State> {
    state = {
        searchString: '',
        sortingState: SortingState.LexicalAsc,
    };

    searchInputRef = React.createRef<HTMLInputElement>();

    render() {
        const searchEmpty = this.state.searchString === '';

        let clearSearchClassName = 'btn trace-search-clear';
        if (searchEmpty) clearSearchClassName += ' hidden';

        const sIcon = sortingIcon[this.state.sortingState];

        return (
            <div className='trace-search-row'>
                <span className='trace-search-input'>
                    <input
                        placeholder="Search..."
                        ref={this.searchInputRef}
                        onChange={this.onSearchChange}
                        className={ searchEmpty ? 'empty' : 'non-empty' }
                    />
                </span>
                <span className={clearSearchClassName} onClick={this.clearSearch}>
                    <FontAwesomeIcon icon={faTimes} />
                </span>
                <span className='btn trace-filter'>
                    <FontAwesomeIcon icon={faFilter} />
                </span>
                <span className='btn trace-sort' onClick={this.toggleSort}>
                    <FontAwesomeIcon icon={sIcon} />
                </span>
            </div>
        );
    }

    componentDidUpdate(prevProps: Props, prevState: State) {
        const { searchString, sortingState } = this.state;
        const { onFilter, onSort } = this.props;

        let filter: Filter | undefined;
        let sorter: Sorter | undefined;

        // filter updated
        if (searchString !== prevState.searchString) {
            if (searchString === '') {
                filter = undefined;
            } else {
                filter = (t: Trace) => t.title.toLocaleLowerCase().includes(searchString.trim().toLocaleLowerCase());
            }

            onFilter(filter);
        }

        // sorter updated
        if (sortingState !== prevState.sortingState) {
            const collator = new Intl.Collator();

            switch (sortingState) {
                case SortingState.LexicalAsc:
                    sorter = (a: Trace, b: Trace) => collator.compare(a.title, b.title);
                    break;

                case SortingState.LexicalDesc:
                    sorter = (a: Trace, b: Trace) => -collator.compare(a.title, b.title);
                    break;

                default:
                    throw new Error('Sorting by average is not implemented yet');
            }

            onSort(sorter);
        }
    }


    onSearchChange = debounce((e: React.ChangeEvent<HTMLInputElement>) => {
        this.setState({ searchString: e.target.value });
    }, 1000, { leading: true, trailing: true })

    clearSearch = () => {
        this.setState({ searchString: '' });

        const input = this.searchInputRef.current;
        if (input) input.value = '';
    }

    toggleSort = () => {
        let { sortingState } = this.state;
        sortingState = reverseSortingStateDirection(sortingState);
        this.setState({ sortingState });
    }

    selectedGraph = () => this.props.graphs.find(g => g.id === this.props.focused);

    actionClicked = (e: React.MouseEvent<HTMLButtonElement>) => {
        const action = e.currentTarget.dataset.action as TraceAction;
        const activeGraph = this.selectedGraph();

        if (activeGraph === undefined) return;

        this.props.graph_action({ id: activeGraph.id, action});
    }

}

export default connect(storeProps, dispatchProps)(TraceSearchRow);
