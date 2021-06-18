
import moment from 'moment-timezone';
import * as React from 'react';
import { Button, ModalTitle, Form } from 'react-bootstrap';
import { ModalComponent, ModalProps } from '.';
import { t } from '../../locale';
import * as GraphUtils from '../../utils/graph';
import Select, { ValueType } from 'react-select';

export interface Args {
    graph: Graph;
}

type Timezone = { tz: string, text: string };
interface State extends Pick<Graph, 'title' | 'xLabel' | 'yLabel'> {
    timeZones: Timezone[];
    timeZone: Timezone;
}

export type EditResult = Partial<Pick<Graph, 'title' | 'xLabel' | 'yLabel' | 'timeZone'>> | undefined;

class GraphEditModal extends ModalComponent<EditResult, Args, State> {
    constructor(props: ModalProps<EditResult, Args>) {
        super(props);

        const { graph } = this.props;
        const tzs = [
            ...GraphUtils.getTimezones(graph),
        ];

        moment.tz.names().filter(t => !tzs.some(pt => pt.tz === t)).forEach(t => tzs.push({ tz: t, text: t }));

        this.state = {
            title: graph.title,
            xLabel: graph.xLabel,
            yLabel: graph.yLabel,
            timeZones: tzs,
            timeZone: (graph.timeZone ? tzs.find(t => t.tz === graph.timeZone) : undefined) ?? tzs[0],
        };
    }

    protected renderHeader(): JSX.Element {
        return (
            <ModalTitle>{t('modals.editGraph.title', { name: this.state.title })}</ModalTitle>
        );
    }

    
    private onFormSubmit = (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); this.okClicked(); }
    private onFormChange = (e: React.ChangeEvent<HTMLInputElement>) => this.setState({ [e.currentTarget.name]: e.currentTarget.value } as never);
    private onTzSelect = (e: ValueType<Timezone, false>) => e && this.setState({ timeZone: e });

    protected renderBody(): JSX.Element {
        const { timeZone, timeZones } = this.state;

        return (
            <Form onSubmit={this.onFormSubmit}>
                <Form.Group>
                    <Form.Label>{t('graph.title')}</Form.Label>
                    <Form.Control name='title'  value={this.state.title}  onChange={this.onFormChange}></Form.Control>
                </Form.Group>
                <Form.Group>
                    <Form.Label>{t('graph.xLabel')}</Form.Label>
                    <Form.Control name='xLabel' value={this.state.xLabel} onChange={this.onFormChange}></Form.Control>
                </Form.Group>
                <Form.Group>
                    <Form.Label>{t('graph.yLabel')}</Form.Label>
                    <Form.Control name='yLabel' value={this.state.yLabel} onChange={this.onFormChange}></Form.Control>
                </Form.Group>
                {timeZones.length > 0 && <Form.Group>
                    <Form.Label>{t('graph.timeZone')}</Form.Label>
                    <Select
                        isMulti={false}
                        options={timeZones}
                        value={timeZone}
                        getOptionValue={t => t.tz}
                        getOptionLabel={t => t.text}
                        onChange={this.onTzSelect}
                        styles={{
                            option: (provided, state) => ({  ...provided, color: state.isSelected ? 'white' : 'black' })
                        }}
                    />
                </Form.Group>}
                <Form.Control type="submit" hidden />
            </Form>
        );
    }

    private okClicked = () => {
        const st = { ...this.state, timeZone: this.state.timeZone.tz };
        this.resolve(st);
    };
    private cancelClicked = () => this.resolve(undefined);

    protected renderFooter(): JSX.Element {
        return (
            <>
                <Button variant='primary' onClick={this.okClicked}>
                    {t('modals.save')}
                </Button>
                <Button variant='secondary' onClick={this.cancelClicked}>
                    {t('modals.cancel')}
                </Button>
            </>
        );
    }
}

export default GraphEditModal;