
import * as React from 'react';
import { Button, ModalTitle } from 'react-bootstrap';
import { Form, FormControl } from 'react-bootstrap';
import { ModalComponent } from '.';

class TraceSearchModal
extends ModalComponent<Trace['id'][], Args, State> {
    public state: State = {
        search: ''
    };

    protected renderHeader(): JSX.Element {
        return (
            <ModalTitle>Vyhledat křivky</ModalTitle>
        );
    }

    onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const val = event.currentTarget.value;
        this.setState({ search: val });

        // TODO: search promise
    }

    protected renderBody(): JSX.Element {
        return (
            <Form>
                <Form.Group>
                    <Form.Label>Hledaný výraz</Form.Label>
                    <Form.Control placeholder="Hledat..." type="text" value={this.state.search} onChange={this.onChange} />
                </Form.Group>
            </Form>
        );
    }

    private cancelClicked = () => this.resolve(undefined);
    private okClicked = () => this.resolve([]);

    protected renderFooter(): JSX.Element {
        return (
            <>
                <Button variant='primary' onClick={this.okClicked}>
                Zvolit
                </Button>
                <Button variant='secondary' onClick={this.cancelClicked}>
                Zrušit
                </Button>
            </>
        );
    }
}

export interface Args {
    traces: Trace[];
}

interface State {
    search: string;
}

export default TraceSearchModal;