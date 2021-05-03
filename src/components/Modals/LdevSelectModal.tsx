
import * as React from 'react';
import { Button, Form, ModalTitle } from 'react-bootstrap';
import { ModalComponent } from '.';
import { t } from '../../locale';
import { DataService } from '../../services';
import { splitTraceId } from '../../utils/trace';

interface Args {
    traces: Trace[],
}

interface State {
    ldevInfo: LdevInfo[] | undefined,
    map: { [id: string]: LdevInfo },

    mode: 'hostgroup' | 'mpu' | 'pool' | 'port' | 'wwn',
    selected: string[],

    mpus:  Set<string>,
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
        map: {},

        mpus:  new Set(),
        pools: new Set(),
        ports: new Set(),
        wwns:  new Set(),
        hostgroups: new Set(),
    };

    public componentDidMount() {
        DataService.getCompleteLdevMap(this.props.traces).then(ldevInfo => {
            const map: State['map'] = {};
            const mpus:  Set<string> = new Set();
            const pools: Set<string> = new Set();
            const ports: Set<string> = new Set();
            const wwns:  Set<string> = new Set();
            const hostgroups: Set<string> = new Set();

            console.log(ldevInfo);

            for (const trace of this.props.traces) {
                const [ source, set ,variant ] = splitTraceId(trace);

                if (!set || !variant) continue;

                const entry = ldevInfo[source]?.find(l => variant.toLowerCase().startsWith(l.id.toLowerCase()));

                if (entry) {
                    map[trace.id] = entry;

                    mpus.add(entry.mpu);
                    pools.add(entry.poolName);
                    entry.hostPorts.forEach(port => { ports.add(port.port); hostgroups.add(port.hostgroup); });
                    entry.wwns.forEach(wwn => { wwns.add(wwn.wwn); hostgroups.add(wwn.hostgroup); });
                }
                
            }

            this.setState({
                ldevInfo: Object.values(ldevInfo).flatMap(a => a),
                map,

                mpus,
                pools,
                ports,
                wwns,
                hostgroups,
            });
        });
    }

    protected renderHeader(): JSX.Element {
        return (
            <ModalTitle>
                {t('modals.ldevMap.title')}
            </ModalTitle>
        );
    }

    private modeSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        this.setState({ mode: e.currentTarget.value as State['mode'], selected: [] });
    }

    private entrySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        this.setState({ selected: Array.from(e.currentTarget.selectedOptions, i => i.value) });
    }

    protected renderBody(): JSX.Element {
        const { ldevInfo } = this.state;

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
            case 'pool':
                items = [ ...this.state.pools ];
                break;
            case 'port':
                items = [ ...this.state.ports ];
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

        return (
            <Form>
                <Form.Group>
                    <Form.Control as='select' onChange={this.modeSelect} value={this.state.mode}>
                        <option value='hostgroup'>Host Group</option>
                        <option value='port'>Host Port</option>
                        <option value='pool'>Pool</option>
                        <option value='mpu'>MPU</option>
                        <option value='wwn'>WWN</option>
                    </Form.Control>
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
        const { selected, mode, map } = this.state;

        this.resolve(
            this.props.traces.filter(t => {
                const entry = map[t.id];

                if (!entry) return false;

                switch (mode) {
                    case 'mpu':
                        return selected.includes(entry.mpu);
                    case 'pool':
                        return selected.includes(entry.poolName);
                    case 'hostgroup':
                        return entry.hostPorts.findIndex(p => selected.includes(p.hostgroup)) >= 0;
                    case 'wwn':
                        return entry.wwns.findIndex(p => selected.includes(p.wwn)) >= 0; 
                    case 'port':
                        return entry.hostPorts.findIndex(p => selected.includes(p.port)) >= 0;
                    default:
                        return false;
                }
            })
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
