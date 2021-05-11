import * as React from 'react';
import { Button, ButtonGroup, Dropdown, Form } from 'react-bootstrap';
import Calendar from 'react-calendar';
import { dateToTimestamp, parseTimestamp } from '../utils/datetime';

import { t } from '../locale';
import moment from 'moment';
import { connect, StateProps } from '../redux';

import 'react-calendar/dist/Calendar.css';
import './DateTimeRange.css';

// TODO: Time select
const toTimeString = (date: Date) => `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
const clamp = (date: Date, min: Date, max: Date) => {
    if (min > date) return min;
    if (max < date) return max;
    return date;
};

const dateFormat = 'HH:mm DD.MM.YYYY';

class DateTimeRange
    extends React.PureComponent<Props, State> {
    public state: State = { };

    onChange = (value: Date | Date[]) => {
        this.props.onChange && Array.isArray(value) && this.props.onChange(value.map(dateToTimestamp) as Graph['xRange']);
    }
    onTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const date = event.currentTarget.valueAsDate;
    
        if (!date || !this.props.onChange || !this.props.value) {
            return;
        }

        const minDate = parseTimestamp(this.props.bounds.map(b => b[0]).reduce((acc: number, v) => Math.min(acc, v as number), Number.MAX_SAFE_INTEGER));
        const maxDate = parseTimestamp(this.props.bounds.map(b => b[1]).reduce((acc: number, v) => Math.max(acc, v as number), Number.MIN_SAFE_INTEGER));

        const [ from, to ] = this.props.value.map(parseTimestamp);

        if (event.currentTarget.dataset.part === 'from') {
            date.setFullYear(from.getFullYear());
            date.setMonth(from.getMonth());
            date.setDate(from.getDate());
            this.props.onChange([ minDate && maxDate ? clamp(date, minDate, maxDate) : date, to ].map(dateToTimestamp) as Graph['xRange']);
        } else {
            date.setFullYear(to.getFullYear());
            date.setMonth(to.getMonth());
            date.setDate(to.getDate());
            this.props.onChange([ from, minDate && maxDate ? clamp(date, minDate, maxDate) : date ].map(dateToTimestamp) as Graph['xRange']);
        }
    };

    getRangeString = () => {
        if (!this.props.value) return t('modals.addGraph.noRange');

        const [ from, to ] = this.props.value;

        return `${moment(parseTimestamp(from)).format(dateFormat)} - ${moment(parseTimestamp(to)).format(dateFormat)}`;
    }

    onRangeButton = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (!this.props.onChange) return;

        const { from, to, range } = e.currentTarget.dataset;

        if (from && to) {
            this.props.onChange([
                parseInt(from),
                parseInt(to),
            ]);
        } else if (range) {
            const [ start, end ] = this.props.bounds[this.props.bounds.length - 1] as [ number, number ];
            this.props.onChange([
                Math.max(
                    end - parseInt(range),
                    start
                ),
                end
            ]);
        }
    };

    public render() {
        const { value, disabled, graphs } = this.props;

        const minDate = parseTimestamp(this.props.bounds.map(b => b[0]).reduce((acc: number, v) => Math.min(acc, v as number), Number.MAX_SAFE_INTEGER));
        const maxDate = parseTimestamp(this.props.bounds.map(b => b[1]).reduce((acc: number, v) => Math.max(acc, v as number), Number.MIN_SAFE_INTEGER));

        return (
            <div className='range-picker'>
                <Form.Control name='timeRange' readOnly autoComplete='off' value={this.getRangeString()}></Form.Control>
                <Dropdown as={ButtonGroup} className='my-2'>
                    <Button disabled={disabled} onClick={this.onRangeButton} data-range={24 * 60}>{t('modals.addGraph.day')}</Button>
                    <Button disabled={disabled} onClick={this.onRangeButton} data-range={7 * 24 * 60}>{t('modals.addGraph.week')}</Button>
                    <Button disabled={disabled} onClick={this.onRangeButton} data-range={4 * 7 * 24 * 60}>{t('modals.addGraph.month')}</Button>

                    <Dropdown.Toggle disabled={disabled} />
                    <Dropdown.Menu>
                        <Dropdown.Item onClick={this.onRangeButton} data-range={91 * 24 * 60}>{t('modals.addGraph.quarter')}</Dropdown.Item>
                        <Dropdown.Item onClick={this.onRangeButton} data-range={183 * 24 * 60}>{t('modals.addGraph.halfYear')}</Dropdown.Item>
                        <Dropdown.Item onClick={this.onRangeButton} data-range={365 * 24 * 60}>{t('modals.addGraph.year')}</Dropdown.Item>
                        {graphs.length > 0 && (
                            <>
                                <Dropdown.Divider />
                                <Dropdown.ItemText>{t('modals.addGraph.copy')}</Dropdown.ItemText>
                                {graphs.map(g => (
                                    <Dropdown.Item key={g.id} data-from={g.xRange[0]} data-to={g.xRange[1]} onClick={this.onRangeButton}>{g.title}</Dropdown.Item>
                                ))}
                            </>
                        )}
                    </Dropdown.Menu>
                </Dropdown>
                <Calendar minDate={minDate} maxDate={maxDate} value={value?.map(v => parseTimestamp(v))} onChange={this.onChange} returnValue="range" selectRange />
                <div style={{ display: 'flex', width: '100%', flexDirection: 'row', justifyContent: 'stretch'}}>
                    <input disabled={disabled} style={{ flexGrow: 1 }} type='time' data-part='from' value={value ? toTimeString(parseTimestamp(value[0])) : ''} onChange={this.onTimeChange}/>
                    <input disabled={disabled} style={{ flexGrow: 1 }} type='time' data-part='to'   value={value ? toTimeString(parseTimestamp(value[1])) : ''} onChange={this.onTimeChange}/>
                </div>
            </div>
        );
    }
}

const stateProps = (state: RootStore) => ({
    graphs: state.graphs.items,
});

const dispatchProps = { };

export type Props = StateProps<typeof stateProps> & {
    value?: Graph['xRange'];
    bounds: Dataset['dataRange'];

    disabled?: boolean;

    onChange?(value: Graph['xRange']): void;
}

export interface State {
    
}

export default connect(stateProps, dispatchProps)(DateTimeRange);
