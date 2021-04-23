
import * as React from 'react';
import { Button, ModalTitle } from 'react-bootstrap';
import { ModalComponent } from '.';
import { t } from '../../locale';
import { DataService } from '../../services';
import { TreeView, TreeItem } from '../TreeView';

import { faEyeDropper, faServer, faDesktop, faMicrochip, faArrowsAltH, faDatabase, faAngleDoubleRight, faChartPie } from '@fortawesome/free-solid-svg-icons';
import { icon } from '../../utils/icon';

interface Args {
    source: string;
    ldev: string;
}

interface State {
    ldevInfo?: LdevInfo
}

class LdevMapModal extends ModalComponent<void, Args, State> {
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
            <TreeView className="modal-ldev-map">
                <TreeItem>{icon(faDatabase)} LDEV: {ldevInfo.id} [{ldevInfo.name}]</TreeItem>
                <TreeItem>{icon(faArrowsAltH)} SIZE: {ldevInfo.size}</TreeItem>
                <TreeItem>{icon(faMicrochip)} MPU: {ldevInfo.mpu}</TreeItem>
                <TreeItem>{icon(faChartPie)} POOL: {ldevInfo.poolName}</TreeItem>
                <TreeItem>
                    {icon(faDesktop)}
                    HOST:
                    <TreeView>
                        {this.getHostgroups().map(hostgroup => (
                            <TreeItem key={hostgroup}>
                                {icon(faServer)}
                                {hostgroup}
                                <TreeView>
                                    {this.getPorts(hostgroup).map(hostport => (
                                        <TreeItem key={hostport.port}>
                                            {icon(faEyeDropper)}
                                            {hostport.port}
                                            <TreeView>
                                                {this.getWwns(hostport).map(wwn => (
                                                    <TreeItem key={wwn.nickname}>
                                                        {icon(faAngleDoubleRight)}
                                                        {wwn.wwn} [{wwn.nickname}]
                                                    </TreeItem>
                                                ))}
                                            </TreeView>
                                        </TreeItem>
                                    ))}
                                </TreeView>
                            </TreeItem>
                        ))}
                    </TreeView>
                </TreeItem>
            </TreeView>
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

export default LdevMapModal;
