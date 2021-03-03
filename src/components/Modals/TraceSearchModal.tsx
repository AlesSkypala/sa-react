
import * as React from 'react';
import { Button, ModalTitle } from 'react-bootstrap';
import { Form } from 'react-bootstrap';
import { ModalComponent } from '.';

class TraceSearchModal
    extends ModalComponent<Trace['id'][], Args, State> {
    public state: State = {
        search: '',
        found: [],
    };

    protected renderHeader(): JSX.Element {
        return (
            <ModalTitle>Vyhledat křivky</ModalTitle>
        );
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    private searchPromise: Promise<void> = (async () => {})();
    onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const val = event.currentTarget.value;
        this.setState({ search: val });

        // TODO: search promise
        this.searchPromise.then(() => {
            this.setState({ found: [] });
            this.searchPromise = (async () => 
                this.setState({ found: this.props.args.traces.filter(t => t.title.toLowerCase().indexOf(val.toLowerCase()) >= 0) })
            )();
        });
    }

    protected renderBody(): JSX.Element {
        return (
            <Form>
                <Form.Group>
                    <Form.Label>Hledaný výraz</Form.Label>
                    <Form.Control placeholder="Hledat..." type="text" value={this.state.search} onChange={this.onChange} />
                </Form.Group>
                <ul>
                    {this.state.found.map(t => (
                        <li key={t.id}>{t.title}</li>
                    ))}
                </ul>
            </Form>
        );
    }

    private cancelClicked = () => this.resolve(undefined);
    private okClicked = () => this.resolve(this.state.found.map(t => t.id));

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
    found: Trace[];
}

export default TraceSearchModal;