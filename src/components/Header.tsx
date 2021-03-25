import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as React from 'react';
import { faPlus, faUnlock, faLock, faGripVertical, faMinusSquare } from '@fortawesome/free-solid-svg-icons';
import { Dropdown, Nav, NavItem, NavLink } from 'react-bootstrap';
import { connect,  set_stacking, add_graphs, ReduxProps, remove_graphs } from '../redux';
import { DialogService } from '../services';
import { AddGraphModal, ConfirmModal } from './Modals';
import { t } from '../locale';

import './Header.css';

class HeaderComponent
    extends React.Component<Props, State> {

    addGraph = () => 
        DialogService.open(
            AddGraphModal,
            res => res && this.props.add_graphs(res),
            {
                ranges: this.props.graphs.reduce((v, next) => {
                    const [ from, to ] = next.xRange;

                    if (v.findIndex(i => i[0] === from && i[1] === to) < 0) {
                        v.push([ from, to ]);
                    }

                    return v;
                }, [] as Graph['xRange'][])
            }
        );

    onSelectLayout = (key: unknown) => {
        this.props.set_stacking(key as StackingType);
    };

    clearAll = () =>
        this.props.graphIds.length > 0 && DialogService.open(
            ConfirmModal,
            res => res && this.props.remove_graphs(this.props.graphIds),
            {
                title: t('modals.removeGraphs.title'),
                body: t('modals.removeGraphs.body', { count: this.props.graphIds.length }),
                okColor: 'danger',
            },
        );

    public render() {
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
                                <NavLink title={t('header.removeGraphs')} onClick={this.clearAll} disabled={this.props.graphIds.length <= 0}>
                                    <FontAwesomeIcon color='white' icon={faMinusSquare} />
                                </NavLink>
                            </NavItem>
                            <NavItem>
                                <NavLink title={t('header.toggleLock')} onClick={this.props.onToggleLock}>
                                    <FontAwesomeIcon color='white' icon={this.props.layoutUnlocked ? faUnlock : faLock} />
                                    
                                </NavLink>
                            </NavItem>
                            <Dropdown as={NavItem} onSelect={this.onSelectLayout}>
                                <Dropdown.Toggle as={NavLink} className='text-white'>
                                    <FontAwesomeIcon color='white' icon={faGripVertical} />
                                </Dropdown.Toggle>
                                <Dropdown.Menu>
                                    <Dropdown.Item eventKey='vertical'>{t('stacking.vertical')}</Dropdown.Item>
                                    <Dropdown.Item eventKey='horizontal'>{t('stacking.horizontal')}</Dropdown.Item>
                                    <Dropdown.Item eventKey='freeform'>{t('stacking.freeform')}</Dropdown.Item>
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
};

const storeProps = (store: RootStore) => ({
    graphs: store.graphs.items,
    graphIds: store.graphs.items.map(g => g.id),
});

type Props = ReduxProps<typeof storeProps, typeof dispatchProps> & {
    layoutUnlocked?: boolean;
    onToggleLock?(): void;
}

interface State { }

export default connect(storeProps, dispatchProps)(HeaderComponent);