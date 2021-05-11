import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as React from 'react';
import { faPlus, faUnlock, faLock, faGripVertical, faMinusSquare, faLayerGroup, faThLarge, faClone } from '@fortawesome/free-solid-svg-icons';
import { trashAll } from '../assets/icons/trash-all';
import { Dropdown, Nav, NavItem, NavLink } from 'react-bootstrap';
import { connect,  set_stacking, add_graphs, ReduxProps, remove_graphs, invoke_job } from '../redux';
import { DialogService } from '../services';
import { AddGraphModal, ConfirmModal } from './Modals';
import { t } from '../locale';

import './Header.css';

class HeaderComponent
    extends React.Component<Props, State> {

    addGraph = () =>
        DialogService.open(
            AddGraphModal,
            res => {
                if (res) {
                    this.props.add_graphs(res[0]);
                    res[1].forEach(j => this.props.invoke_job(j));
                }
            },
            {
                ranges: this.props.graphs.reduce((v, next) => {
                    const [ from, to ] = next.xRange;

                    if (!v.some(i => i[0] === from && i[1] === to)) {
                        v.push([ from, to ]);
                    }

                    return v;
                }, [] as Graph['xRange'][])
            }
        );

    onSelectLayout = (key: unknown) => {
        this.props.set_stacking(key as StackingType);
    };

    minimizeAll = () =>
        this.props.graphs.length > 0 && alert('society. we live in one');

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

    public render() {
        const {graphs, stacking, layoutUnlocked} = this.props;
        return (
            <header className="main-header">

                <a className="logo">
                    <span className="logo-mini"><b>S</b>an</span>
                    <span className="logo-lg"><b>Storage Analytics</b></span>
                </a>

                <nav className="navbar navbar-static-top navbar-expand-md" role="navigation">
                    <div className="collapse navbar-collapse show">
                        <Nav navbar className='ml-auto'>
                            {this.props.children}
                            <NavItem>
                                <NavLink title={t('header.addGraph')} onClick={this.addGraph}>
                                    <FontAwesomeIcon color='white' icon={faPlus} />
                                </NavLink>
                            </NavItem>
                            <NavItem>
                                <NavLink title={t('header.minimizeGraphs')} onClick={this.minimizeAll} disabled={graphs.length <= 0}>
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
                        </Nav>
                    </div>
                </nav>

            </header>
        );
    }
}

const dispatchProps = {
    set_stacking,
    add_graphs,
    remove_graphs,
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

interface State { }

export default connect(storeProps, dispatchProps)(HeaderComponent);
