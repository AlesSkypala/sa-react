/* eslint-disable jsx-a11y/anchor-is-valid */
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as React from 'react';
import { faPlus, faUnlock, faLock } from '@fortawesome/free-solid-svg-icons';
import { Nav, NavItem, NavLink } from 'react-bootstrap';

import './Header.css';

class HeaderComponent
extends React.Component<Props, State> {
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
                            <li className='nav-item' title="">
                                
                            </li>
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
}

export interface State {
}

export default HeaderComponent;