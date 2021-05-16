
import * as React from 'react';
import { Button, Col, Form, ModalTitle } from 'react-bootstrap';
import { ModalComponent } from '.';
import { t } from '../../locale';
import { DataService } from '../../services';
import { isHomogenous } from '../../utils/trace';
import fuse from 'fuse.js';
import { getLdevMode, getLdevModeFromDataset, relatesTo, toLdevInternal } from '../../utils/ldev';

interface Args {
    traces: Trace[],
}

interface State {
    ldevInfo: LdevInfo[] | undefined,

    mode: LdevMapMode,
    selected: string[],

    search: string,
    activeOnly: boolean,

    mpus:  Set<string>,
    eccs: Set<string>,
    pools: Set<string>,
    ports: Set<string>,
    wwns:  Set<string>,
    hostgroups:  Set<string>,
}

class LdevSelectModal extends ModalComponent<Trace[], Args, State> {
    public state: State = {
        ldevInfo: undefined,
        mode: 'port',
        selected: [],

        search: '',
        activeOnly: true,

        mpus:  new Set(),
        eccs: new Set(),
        ports: new Set(),
        pools: new Set(),
        wwns:  new Set(),
        hostgroups: new Set(),
    };

    public componentDidMount() {
        this.buildTree();
    }

    public componentDidUpdate(prevProps: unknown, prevState: State) {
        if (prevState.activeOnly !== this.state.activeOnly) {
            this.buildTree();
        }
    }

    private buildTree = () => {
        this.setState({ ldevInfo: undefined });

        const traces = this.state.activeOnly ? this.props.traces.filter(t => t.active) : this.props.traces;

        const homog = isHomogenous(traces);
        if (!homog) return;

        const [ _source, dataset ] = homog;
        
        const mode = getLdevModeFromDataset(dataset);
        if (!mode) return;

        DataService.getHomogenousLdevMap(traces, mode).then(ldevInfo => {
            const mpus:  Set<string> = new Set();
            const eccs: Set<string> = new Set();
            const ports: Set<string> = new Set();
            const pools: Set<string> = new Set();
            const wwns:  Set<string> = new Set();
            const hostgroups: Set<string> = new Set();

            for (const entry of ldevInfo) {

                mpus.add(entry.mpu);
                if (entry.pool) {
                    entry.pool.eccGroups.forEach(e => eccs.add(e));
                    pools.add(entry.pool.name);
                }
                entry.hostPorts.forEach(port => { ports.add(port.port); hostgroups.add(port.hostgroup); });
                entry.wwns.forEach(wwn => { wwns.add(wwn.wwn); hostgroups.add(wwn.hostgroup); });
            }

            this.setState({
                ldevInfo: Object.values(ldevInfo).flatMap(a => a),

                mpus,
                eccs,
                ports,
                pools,
                wwns,
                hostgroups,
            });
        });
    }

    protected renderHeader(): JSX.Element {
        return (
            <ModalTitle>
                {t('modals.ldevSelect.title')}
            </ModalTitle>
        );
    }

    private modeSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        this.setState({ mode: e.currentTarget.value as State['mode'], selected: [] });
    }

    private entrySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        this.setState({ selected: Array.from(e.currentTarget.selectedOptions, i => i.value) });
    }

    private toggleActive = () => this.setState({ activeOnly: !this.state.activeOnly });
    private setSearch = (e: React.ChangeEvent<HTMLInputElement>) => this.setState({ search: e.currentTarget.value });

    protected renderBody(): JSX.Element {
        const { ldevInfo, search, activeOnly } = this.state;

        if (!ldevInfo) {
            return (
                <div>{t('modals.ldevMap.loading')}...</div>
            );
        }

        // const {traces} = this.props;
        // const {ldevMap} = this.state;

        let items: string[];

        switch (this.state.mode) {
            case 'mpu':
                items = [ ...this.state.mpus ];
                break;
            case 'ecc':
                items = [ ...this.state.eccs ];
                break;
            case 'port':
                items = [ ...this.state.ports ];
                break;
            case 'pool':
                items = [ ...this.state.pools ];
                break;
            case 'wwn':
                items = [ ...this.state.wwns ];
                break;
            case 'hostgroup':
                items = [ ...this.state.hostgroups ];
                break;
            default:
                items = [ ];
                break;
        }

        if (search.length > 0) {
            const fs = new fuse(items, { threshold: 0.3, });
            items = fs.search(search).map(f => f.item);
        }

        return (
            <Form>
                <Form.Row className='align-items-center'>
                    <Form.Group as={Col} sm='8'>
                        <Form.Control as='select' onChange={this.modeSelect} value={this.state.mode}>
                            <option value='hostgroup'>{t('modals.ldevSelect.hostgroup')}</option>
                            <option value='port'>{t('modals.ldevSelect.port')}</option>
                            <option value='ecc'>{t('modals.ldevSelect.ecc')}</option>
                            <option value='pool'>{t('modals.ldevSelect.pool')}</option>
                            <option value='mpu'>{t('modals.ldevSelect.mpu')}</option>
                            <option value='wwn'>{t('modals.ldevSelect.wwn')}</option>
                        </Form.Control>
                    </Form.Group>
                    <Form.Group as={Col}>
                        <Form.Check type='checkbox' label={t('modals.ldevSelect.activeOnly')} checked={activeOnly} onChange={this.toggleActive} />
                    </Form.Group>
                </Form.Row>
                <Form.Group>
                    <Form.Control type='text' placeholder={t('modals.ldevSelect.search')} value={search} onChange={this.setSearch}/>
                </Form.Group>
                <Form.Group>
                    <Form.Control as='select' multiple onChange={this.entrySelect} value={this.state.selected} style={{ height: '50vh' }}>
                        {items.map((t, i) => (
                            <option key={i}>{t}</option>
                        ))}
                    </Form.Control>
                </Form.Group>
            </Form>
        );
    }

    private okClicked = () => {
        const { selected, mode, ldevInfo } = this.state;
        const traces = this.state.activeOnly ? this.props.traces.filter(p => p.active) : this.props.traces;

        if (!ldevInfo || traces.length < 0) { this.resolve(undefined); return; }

        const traceMode = getLdevMode(traces[0]) as LdevMapMode;
        const ldevs = ldevInfo.filter(l => selected.some(s => relatesTo(l, s, mode)));

        this.resolve(
            traces.filter(t => ldevs.some(l => relatesTo(l, toLdevInternal(t, traceMode), traceMode)))
        );
    }
    private backClicked = () => this.resolve(undefined);

    protected renderFooter(): JSX.Element {
        return (
            <>
                <Button variant='primary' onClick={this.okClicked}>
                    {t('modals.ok')}
                </Button>
                <Button variant='secondary' onClick={this.backClicked}>
                    {t('modals.back')}
                </Button>
            </>
        );
    }
}

export default LdevSelectModal;
