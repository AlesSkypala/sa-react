import * as React from 'react';

import './SideMenu.css';

class SideMenuComponent
extends React.Component<Props, State> {
    public render() {
        return (
            <aside className="main-sidebar">
                <section className="sidebar">
                {this.props.children}
                </section>
            </aside>
        );
    }
}

export interface Props {
}

export interface State {
}

export default SideMenuComponent;