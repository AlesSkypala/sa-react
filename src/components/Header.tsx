import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as React from 'react';
import { faPlus, faUnlock, faLock, faGripVertical } from '@fortawesome/free-solid-svg-icons';
import { Dropdown, Nav, NavItem, NavLink } from 'react-bootstrap';

import './Header.css';

class HeaderComponent
    extends React.Component<Props, State> {

    onSelectLayout = (key: unknown) => {
        this.props.onLayout && this.props.onLayout(key as StackingType);
    };

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
                                <NavLink title='Přidat graf' onClick={this.props.onAddGraph}>
                                    <FontAwesomeIcon color='white' icon={faPlus} />
                                </NavLink>
                            </NavItem>
                            <NavItem>
                                <NavLink title='Odemknout/zamknout rozvržení' onClick={this.props.onToggleLock}>
                                    <FontAwesomeIcon color='white' icon={this.props.layoutUnlocked ? faUnlock : faLock} />
                                    
                                </NavLink>
                            </NavItem>
                            <Dropdown as={NavItem} onSelect={this.onSelectLayout}>
                                <Dropdown.Toggle as={NavLink} title='Odemknout/zamknout rozvržení' className='text-white'>
                                    <FontAwesomeIcon color='white' icon={faGripVertical} />
                                </Dropdown.Toggle>
                                <Dropdown.Menu>
                                    <Dropdown.Item eventKey='vertical'>Vertikálně</Dropdown.Item>
                                    <Dropdown.Item eventKey='horizontal'>Horizontálně</Dropdown.Item>
                                    <Dropdown.Item eventKey='freeform'>Odemknout</Dropdown.Item>
                                </Dropdown.Menu>
                            </Dropdown>
                        </Nav>
                    </div>
                </nav>

            </header>
        );
    }
}

export interface Props {
    layoutUnlocked?: boolean;

    onAddGraph?(): void;
    onToggleLock?(): void;
    onLayout?(type: StackingType): void;
}

export interface State {
}

export default HeaderComponent;