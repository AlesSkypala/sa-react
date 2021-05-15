
import * as React from 'react';
import { Button, Form, ModalTitle } from 'react-bootstrap';
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

class SettingsBody extends React.Component<ReduxProps<typeof settingsProps, typeof settingsDispatch>> {

    private checkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if ('setting' in e.currentTarget.dataset) {
            const setting = e.currentTarget.dataset['setting'] as keyof RootStore['settings'];
            this.props.set_settings({ [setting]: e.currentTarget.checked });
        }
    }

    public render() {
        const { settings } = this.props;

        return (
            <Form>
                <Form.Group>
                    <Form.Check checked={settings.askGraphClose} onChange={this.checkChange} label={t('modals.settings.askGraphClose')} data-setting='askGraphClose' />
                </Form.Group>
            </Form>
        );
    }
}

const SetBody = connect(settingsProps, settingsDispatch)(SettingsBody);

export default SettingsModal;