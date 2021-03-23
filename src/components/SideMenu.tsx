import * as React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle } from '@fortawesome/free-solid-svg-icons';
import { Button } from 'react-bootstrap';

import './SideMenu.css';
import TraceList from './TraceList';
import { connect } from 'react-redux';
import { ReduxProps, graph_action } from '../redux';

class SideMenuComponent
    extends React.Component<Props, State> {
    onPropertyChange = ({ currentTarget: { name, value } }: React.ChangeEvent<HTMLInputElement>) => this.props.onGraphPropChange(name as keyof Graph, value);

    onAction = (action: TraceAction) => this.props.graph_action({ id: this.props.selectedGraph?.id ?? -1, action});

    public render() {
        const { selectedGraph } = this.props;

        return (
            <aside className='main-sidebar'>
                <section className='sidebar'>
                    {selectedGraph ? (
                        <>
                            <ul className="sidebar-menu">
                                <li className="header d-flex align-items-center pr-1 py-0">
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
                                activeTraces={selectedGraph.activeTraces}

                                onSelect={this.props.onTraceSelect}
                                onAction={this.onAction}
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

const dispatchProps = {
    graph_action
};

type Props = ReduxProps<() => unknown, typeof dispatchProps> & {
    selectedGraph?: Graph;

    onGraphPropChange<T extends keyof Graph>(key: T, value: Graph[T]): void;
    onTraceSelect(id: Trace['id']): void;
    onTraceAddClick(): void;
}

interface State { }

export default connect(undefined, dispatchProps)(SideMenuComponent);