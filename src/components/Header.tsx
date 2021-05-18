import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as React from 'react';
import { faPlus, faUnlock, faLock, faGripVertical, faMinusSquare, faLayerGroup, faThLarge, faClone, faCogs } from '@fortawesome/free-solid-svg-icons';
import { trashAll } from '../assets/icons/trash-all';
import { Dropdown, Nav, NavItem, NavLink } from 'react-bootstrap';
import { connect,  set_stacking, add_graphs, hide_graphs, ReduxProps, remove_graphs, invoke_job } from '../redux';
import { DialogService } from '../services';
import { AddGraphModal, ConfirmModal } from './Modals';
import { t } from '../locale';

import './Header.css';
import { Args } from './Modals/AddGraphModal';
import HiddenGraphs from './HiddenGraphs';
import SettingsModal from './Modals/SettingsModal';

const noop = () => undefined;


const dispatchProps = {
    set_stacking,
    add_graphs,
    remove_graphs,
    hide_graphs,
    invoke_job,
};

const storeProps = (store: RootStore) => ({
    graphs: store.graphs.items,
    stacking: store.graphs.stacking,
});

type Props = ReduxProps<typeof storeProps, typeof dispatchProps> & {
    layoutUnlocked?: boolean;
    onToggleLock?(): void;
}

interface State {
    hiddenGraphsCollapsed: boolean
}


class HeaderComponent
    extends React.Component<Props, State> {

    state = { hiddenGraphsCollapsed: false };
    spacingRef = React.createRef<HTMLDivElement>();
    numberOfHiddenGraphs = 0;

    addGraph = () =>
        DialogService.open(
            AddGraphModal,
            noop,
            {
                ranges: this.props.graphs.reduce((v, next) => {
                    const [ from, to ] = next.xRange;

                    if (!v.some(i => i[0] === from && i[1] === to)) {
                        v.push([ from, to ]);
                    }

                    return v;
                }, [] as Graph['xRange'][]),


                onAddGraphs: res => {
                    if (res) {
                        this.props.add_graphs(res[0]);
                        res[1].forEach(j => this.props.invoke_job(j));
                    }
                }
            } as Args
        );

    onSelectLayout = (key: unknown) => {
        this.props.set_stacking(key as StackingType);
    };

    hideAll = () => {
        this.props.hide_graphs(this.props.graphs.filter(g => g.visible).map(g => g.id));
    };

    clearAll = () =>
        this.props.graphs.length > 0 && DialogService.open(
            ConfirmModal,
            res => res && this.props.remove_graphs(this.props.graphs.map(g => g.id)),
            {
                title: t('modals.removeGraphs.title'),
                body: t('modals.removeGraphs.body', { count: this.props.graphs.length }),
                okColor: 'danger',
            },
        );

    openSettings = () =>
        DialogService.open(
            SettingsModal,
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            () => {},
            {},
        );

    manageCollapsing = () => {
        // if number of hidden graphs decreased, try unhiding
        const numberOfHiddenGraphs = this.props.graphs.filter(g => !g.visible).length;
        if (numberOfHiddenGraphs < this.numberOfHiddenGraphs) this.setState({ hiddenGraphsCollapsed: false });
        this.numberOfHiddenGraphs = numberOfHiddenGraphs;

        // hide if overflowing
        requestAnimationFrame(() => {
            if (!this.state.hiddenGraphsCollapsed) {
                const width = this.spacingRef.current?.getBoundingClientRect()?.width;

                if (width !== undefined && width < 5) {
                    this.setState({
                        hiddenGraphsCollapsed: true
                    });
                }
            }
        });
    }

    public render() {
        const {graphs, stacking, layoutUnlocked} = this.props;
        this.manageCollapsing();

        return (
            <header className="main-header">

                <a className="logo">
                    <span className="logo-mini"><b>S</b>an</span>
                    <span className="logo-lg"><b>Storage Analytics</b></span>
                </a>

                <nav className="navbar navbar-static-top navbar-expand-md" role="navigation">
                    <div className="collapse navbar-collapse show">
                        <Nav navbar className='w-100 mw-100 align-items-center flex-nowrap'>
                            <NavItem>
                                <HiddenGraphs collapsed={this.state.hiddenGraphsCollapsed} />
                            </NavItem>

                            <div className="flex-grow-1" ref={this.spacingRef} />

                            {this.props.children}
                            <NavItem>
                                <NavLink title={t('header.addGraph')} onClick={this.addGraph}>
                                    <FontAwesomeIcon color='white' icon={faPlus} />
                                </NavLink>
                            </NavItem>
                            <NavItem>
                                <NavLink title={t('header.hideGraphs')} onClick={this.hideAll} disabled={graphs.length <= 0}>
                                    <FontAwesomeIcon color='white' icon={faMinusSquare} />
                                </NavLink>
                            </NavItem>
                            <NavItem>
                                <NavLink title={t('header.removeGraphs')} onClick={this.clearAll} disabled={graphs.length <= 0}>
                                    <FontAwesomeIcon color='white' icon={trashAll} />
                                </NavLink>
                            </NavItem>
                            <NavItem>
                                <NavLink title={t('header.toggleLock')} onClick={this.props.onToggleLock}>
                                    <FontAwesomeIcon color='white' icon={layoutUnlocked ? faUnlock : faLock} />
                                </NavLink>
                            </NavItem>
                            <Dropdown as={NavItem} onSelect={this.onSelectLayout}>
                                <Dropdown.Toggle as={NavLink} className='text-white'>
                                    <FontAwesomeIcon color='white' icon={faGripVertical} />
                                </Dropdown.Toggle>
                                <Dropdown.Menu>
                                    <Dropdown.Item active={stacking === 'grid'}       eventKey='grid'>      <FontAwesomeIcon color='black' icon={faThLarge}    className='mr-2' />{t('stacking.grid')}</Dropdown.Item>
                                    <Dropdown.Item active={stacking === 'vertical'}   eventKey='vertical'>  <FontAwesomeIcon color='black' icon={faLayerGroup} className='mr-2' />{t('stacking.vertical')}</Dropdown.Item>
                                    <Dropdown.Item active={stacking === 'horizontal'} eventKey='horizontal'><FontAwesomeIcon color='black' icon={faLayerGroup} className='mr-2' style={{ transform: 'rotate(-90deg)' }} />{t('stacking.horizontal')}</Dropdown.Item>
                                    <Dropdown.Item active={stacking === 'freeform'}   eventKey='freeform'>  <FontAwesomeIcon color='black' icon={faClone}      className='mr-2' />{t('stacking.freeform')}</Dropdown.Item>
                                </Dropdown.Menu>
                            </Dropdown>
                            <NavItem>
                                <NavLink title={t('header.settings')} onClick={this.openSettings}>
                                    <FontAwesomeIcon color='white' icon={faCogs} />
                                </NavLink>
                            </NavItem>
                        </Nav>
                    </div>
                </nav>

            </header>
        );
    }
}

export default connect(storeProps, dispatchProps)(HeaderComponent);
