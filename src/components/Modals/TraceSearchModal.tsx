
import * as React from 'react';
import { Button, ModalTitle } from 'react-bootstrap';
import { Form } from 'react-bootstrap';
import { ModalComponent } from '.';
import { t } from '../../locale';

class TraceSearchModal
    extends ModalComponent<Trace['id'][], Args, State> {
    public state: State = {
        search: '',
        found: [],
    };

    protected renderHeader(): JSX.Element {
        return (
            <ModalTitle>{t('modals.traceSearch.title')}</ModalTitle>
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
                this.setState({ found: this.props.traces.filter(t => t.title.toLowerCase().indexOf(val.toLowerCase()) >= 0) })
            )();
        });
    }

    protected renderBody(): JSX.Element {
        return (
            <Form>
                <Form.Group>
                    <Form.Label>{t('modals.traceSearch.term')}</Form.Label>
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
                    {t('modals.ok')}
                </Button>
                <Button variant='secondary' onClick={this.cancelClicked}>
                    {t('modals.back')}
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