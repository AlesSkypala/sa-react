import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle } from '@fortawesome/free-solid-svg-icons';
import * as React from 'react';
import { Button, Form } from 'react-bootstrap';

import './SideMenu.css';
import TraceList from './TraceList';

class SideMenuComponent
extends React.Component<Props, State> {
    onPropertyChange = ({ currentTarget: { name, value } }: React.ChangeEvent<HTMLInputElement>) => this.props.onGraphPropChange(name as keyof Graph, value);

    public render() {
        const { selectedGraph, selectedTraces } = this.props;

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
                            <li className="header d-flex align-items-center pr-1">
                                KŘIVKY
                                <Button
                                    variant='link'
                                    className='btn-menu active text-secondary'
                                    style={{ marginLeft: 'auto'}}
                                    onClick={this.props.onTraceAddClick}
                                >
                                    <FontAwesomeIcon icon={faPlusCircle} />
                                </Button>
                            </li>
                        </ul>
                        <TraceList
                            traces={selectedGraph.traces}
                            selected={selectedTraces}

                            onSelect={this.props.onTraceSelect}
                            onAction={this.props.onTraceAction}                            
                        />
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
    selectedTraces: Trace['id'][];

    onGraphPropChange<T extends keyof Graph>(key: T, value: Graph[T]): void;
    onTraceSelect(id: Trace['id']): void;
    onTraceAction(action: TraceAction): void;
    onTraceAddClick(): void;
}

export interface State {
}

export default SideMenuComponent;