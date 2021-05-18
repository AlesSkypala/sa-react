
import * as React from 'react';
import { Button, Col, Form, ModalTitle, Row } from 'react-bootstrap';
import { connect } from 'react-redux';
import { ModalComponent } from '.';
import { ReduxProps, set_settings } from '../../redux/';
import { t } from '../../locale';

export interface Args { }

class SettingsModal extends ModalComponent<boolean, Args> {

    private onAskChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        this.setState({ ignoreNext: Boolean(e.currentTarget.checked) });
    }

    protected renderHeader(): JSX.Element {
        return (
            <ModalTitle>{t('modals.settings.title')}</ModalTitle>
        );
    }
    protected renderBody(): React.ReactNode {
        return (
            <SetBody />
        );
    }

    private okClicked = () => this.resolve(true);

    protected renderFooter(): JSX.Element {
        return (
            <Button variant={'primary'} onClick={this.okClicked}>
                {t('modals.ok')}
            </Button>
        );
    }
}

const settingsProps = (store: RootStore) => ({
    settings: store.settings
});

const settingsDispatch = {
    set_settings,
};

const settingsTree: { key: keyof RootStore['settings'], type: 'check' | 'number', max?: number, min?: number }[] = [
    { key: 'askGraphClose', type: 'check' },
    { key: 'activeContexts', type: 'number', max: 32, min: 1 },
];

class SettingsBody extends React.Component<ReduxProps<typeof settingsProps, typeof settingsDispatch>> {

    private checkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if ('setting' in e.currentTarget.dataset) {
            const setting = e.currentTarget.dataset['setting'] as keyof RootStore['settings'];
            this.props.set_settings({ [setting]: e.currentTarget.checked });
        }
    }

    private numberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if ('setting' in e.currentTarget.dataset) {
            const setting = e.currentTarget.dataset['setting'] as keyof RootStore['settings'];
            this.props.set_settings({ [setting]: Number.parseInt(e.currentTarget.value) });
        }
    }

    private renderRow = (row: typeof settingsTree[0]) => {
        const { settings } = this.props;

        switch (row.type) {
            case 'check':
                return (
                    <Form.Group>
                        <Form.Check checked={settings[row.key] as boolean} onChange={this.checkChange} label={t(`modals.settings.${row.key}`)} data-setting={row.key} />
                    </Form.Group>
                );
            case 'number':
                return (
                    <Form.Group as={Row}>
                        <Form.Label column sm={4}>{t(`modals.settings.${row.key}`)}</Form.Label>
                        <Col sm={8}>
                            <Form.Control
                                type='number'
                                value={settings[row.key] as number}
                                data-setting={row.key}
                                min={row.min}
                                max={row.max} 

                                onChange={this.numberChange}
                            />
                        </Col>
                    </Form.Group>
                );
            default:
                return (<div>?</div>);
        }
    }

    public render() {
        return (
            <Form>
                {settingsTree.map(t => this.renderRow(t))}
            </Form>
        );
    }
}

const SetBody = connect(settingsProps, settingsDispatch)(SettingsBody);

export default SettingsModal;