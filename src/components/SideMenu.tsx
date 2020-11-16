import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle } from '@fortawesome/free-solid-svg-icons';
import * as React from 'react';

import './SideMenu.css';
import TraceList from './TraceList';

class SideMenuComponent
extends React.Component<Props, State> {
    public render() {
        const { selectedGraph } = this.props;

        return (
            <aside className='main-sidebar'>
                <section className='sidebar'>
                {selectedGraph ? (
                    <>
                        <ul className="sidebar-menu"><li className="header">VLASTNOSTI</li></ul>
                        <form style={{ color: 'white' }}>
                            <div className="form-group"><label>Název:</label><input className="form-control" type="text" value={selectedGraph.title}  /></div>
                            <div className="form-group"><label>Osa x:</label><input className="form-control" type="text" value={selectedGraph.xLabel} /></div>
                            <div className="form-group"><label>Osa y:</label><input className="form-control" type="text" value={selectedGraph.yLabel} /></div>
                        </form>
                        <ul className="sidebar-menu">
                            <li className="header" style={{ display: 'flex', alignItems: 'center' }}>
                                KŘIVKY
                                <span className="btn btn-menu active text-secondary"><FontAwesomeIcon icon={faPlusCircle} /></span>
                            </li>
                        </ul>
                        <TraceList traces={selectedGraph.traces} />
                        {/* <app-trace-controls (action)="traceControl($event)"></app-trace-controls>
                        <app-trace-list
                        [traces]="selectedGraph.traces"
                        [selected]="selectedTraces"
                        (toggle)="toggleTrace($event)"
                        (showLdevMap)="showLdevMap($event)"
                        >
                        </app-trace-list> */}
                    </>
                ) : (
                    <ul className='sidebar-menu'>
                        <li className='header'>VYBERTE GRAF</li>
                    </ul>
                )}
                {this.props.children}
                </section>
            </aside>
        );
    }
}

export interface Props {
    selectedGraph?: Graph;

}

export interface State {
}

export default SideMenuComponent;