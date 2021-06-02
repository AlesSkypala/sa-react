import * as React from 'react';
import { connect, ReduxProps } from '../redux';
import { t } from '../locale';

import TraceList from './TraceList';
import ActionsMenu from './ActionsMenu';

import './SideMenu.scss';

const dispatchProps = {};

const storeProps = (store: RootStore) => ({
    graphs: store.graphs.items,
    selectedGraphId: store.graphs.focused
});

type Props = ReduxProps<typeof storeProps, typeof dispatchProps> & {
    onTraceAddClick(): void;
}

interface State {}

class SideMenuComponent
    extends React.Component<Props, State> {

    public render() {
        return (
            <aside className='main-sidebar'>
                <section className='sidebar'>
                    {this.renderContent()}
                </section>
            </aside>
        );
    }

    selectedGraph = () => this.props.graphs.find(g => g.id === this.props.selectedGraphId);

    renderContent() {
        const selectedGraph = this.selectedGraph();

        if (!selectedGraph) {
            return <ul className='sidebar-menu'>
                <li className='header'>{t('sidemenu.choose').toUpperCase()}</li>
            </ul>;
        }

        return <>
            <ActionsMenu />
            <TraceList traces={selectedGraph.traces} />
        </>;
    }
}

export default connect(storeProps, dispatchProps)(SideMenuComponent);
