
import * as React from 'react';
import { Button, ModalTitle } from 'react-bootstrap';
import { ModalComponent } from '.';
import { t } from '../../locale';
import { DataService } from '../../services';

import './LdevMapModal.css';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEyeDropper, faServer, faDesktop, faMicrochip, faArrowsAltH, faDatabase, faAngleDoubleRight, faChartPie, IconDefinition } from '@fortawesome/free-solid-svg-icons';
const icon = (i: IconDefinition) => <><FontAwesomeIcon icon={i} /> &nbsp;</>;

class LdevMapModal
    extends ModalComponent<void, Args, State> {
    public state: State = {
        ldevInfo: undefined,
    };

    public componentDidMount() {
        const { source, ldev } = this.props;
        DataService.getLdevMap(source, ldev).then(ldevInfo => this.setState({ ldevInfo }));
    }

    protected renderHeader(): JSX.Element {
        const { ldevInfo } = this.state;

        return (
            <ModalTitle>
                {t('modals.ldevMap.title')}
                {ldevInfo ? ' – ' + ldevInfo.id : undefined}
            </ModalTitle>
        );
    }

    getHostgroups = () => (this.state.ldevInfo?.hostPorts ?? []).map(hp => hp.hostgroup).filter((v, i, a) => a.indexOf(v) === i);
    getPorts = (hostgroup: string) => (this.state.ldevInfo?.hostPorts ?? []).filter(v => v.hostgroup === hostgroup);
    getWwns = (hostport: HostPort) => (this.state.ldevInfo?.wwns ?? []).filter(w => w.hostgroup === hostport.hostgroup && w.port === hostport.port);

    protected renderBody(): JSX.Element {
        const { ldevInfo } = this.state;

        if (!ldevInfo) {
            return (
                <div>{t('modals.ldevMap.loading')}...</div>
            );
        }

        // TODO: handle error

        return (
            <ul className="modal-ldev-map">
                <li>{icon(faDatabase)} LDEV: {ldevInfo.id} [{ldevInfo.name}]</li>
                <li>{icon(faArrowsAltH)} SIZE: {ldevInfo.size}</li>
                <li>{icon(faMicrochip)} MPU: {ldevInfo.mpu}</li>
                <li>{icon(faChartPie)} POOL: {ldevInfo.poolName}</li>
                <li>
                    {icon(faDesktop)}
                    HOST:
                    <ul>
                        {this.getHostgroups().map(hostgroup => (
                            <li key={hostgroup}>
                                {icon(faServer)}
                                {hostgroup}
                                <ul>
                                    {this.getPorts(hostgroup).map(hostport => (
                                        <li key={hostport.port}>
                                            {icon(faEyeDropper)}
                                            {hostport.port}
                                            <ul>
                                                {this.getWwns(hostport).map(wwn => (
                                                    <li key={wwn.nickname}>
                                                        {icon(faAngleDoubleRight)}
                                                        {wwn.wwn} [{wwn.nickname}]
                                                    </li>
                                                ))}
                                            </ul>
                                        </li>
                                    ))}
                                </ul>
                            </li>
                        ))}
                    </ul>
                </li>
            </ul>
        );
    }

    private okClicked = () => this.resolve(undefined);
    protected renderFooter(): JSX.Element {
        return (
            <Button variant='primary' onClick={this.okClicked}>
                {t('modals.back')}
            </Button>
        );
    }
}

interface Args {
    source: string;
    ldev: string;
}

interface State {
    ldevInfo?: LdevInfo
}

export default LdevMapModal;
