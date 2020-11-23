import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle } from '@fortawesome/free-solid-svg-icons';
import * as React from 'react';
import { Form } from 'react-bootstrap';

import './SideMenu.css';
import TraceList from './TraceList';

class SideMenuComponent
extends React.Component<Props, State> {
    onPropertyChange = (event: React.ChangeEvent<HTMLInputElement>) => this.props.onPropertyChange && this.props.onPropertyChange(event.currentTarget.name as keyof Graph, event.currentTarget.value);

    public render() {
        const { selectedGraph } = this.props;

        return (
            <aside className='main-sidebar'>
                <section className='sidebar'>
                {selectedGraph ? (
                    <>
                        <ul className="sidebar-menu"><li className="header">VLASTNOSTI</li></ul>
                        <Form style={{ color: 'white' }}>
                            <Form.Group><Form.Label>Název:</Form.Label><Form.Control name='title' value={selectedGraph.title} onChange={this.onPropertyChange} /></Form.Group>
                            <Form.Group><Form.Label>Osa x:</Form.Label><Form.Control name='xLabel' value={selectedGraph.xLabel} onChange={this.onPropertyChange} /></Form.Group>
                            <Form.Group><Form.Label>Osa y:</Form.Label><Form.Control name='yLabel' value={selectedGraph.yLabel} onChange={this.onPropertyChange} /></Form.Group>
                        </Form>
                        <ul className="sidebar-menu">
                            <li className="header" style={{ display: 'flex', alignItems: 'center' }}>
                                KŘIVKY
                                <span className="btn btn-menu active text-secondary" style={{ marginLeft: 'auto'}}><FontAwesomeIcon icon={faPlusCircle} /></span>
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

    onPropertyChange?<T extends keyof Graph>(key: T, value: Graph[T]): void;
}

export interface State {
}

export default SideMenuComponent;