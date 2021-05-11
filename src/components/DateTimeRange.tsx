import * as React from 'react';
import { Button, ButtonGroup, Dropdown, Form } from 'react-bootstrap';
import Calendar, { CalendarTileProperties, Detail, ViewCallbackProperties } from 'react-calendar';
import { dateToTimestamp, parseTimestamp, rangeIntersectsBounds } from '../utils/datetime';

import { t } from '../locale';
import moment from 'moment';
import { connect, StateProps } from '../redux';

import 'react-calendar/dist/Calendar.css';
import './DateTimeRange.css';

// TODO: Time select
// const toTimeString = (date: Date) => `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
const clamp = (date: Date, min: Date, max: Date) => {
    if (min > date) return min;
    if (max < date) return max;
    return date;
};

const dateFormat = 'HH:mm DD.MM.YYYY';

class DateTimeRange
    extends React.PureComponent<Props, State> {
    public state: State = { 
        calendarMode: 'disabled',
        activeStartDate: new Date(),
        view: 'month',
    };

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
        
        let skipTo: Date | undefined;

        if (from && to) {
            skipTo = parseTimestamp(parseInt(to));

            this.props.onChange([
                parseInt(from),
                parseInt(to),
            ]);
        } else if (range) {
            const [ start, end ] = this.props.bounds[this.props.bounds.length - 1] as [ number, number ];
            
            skipTo = parseTimestamp(end);
            this.props.onChange([
                Math.max(
                    end - parseInt(range),
                    start
                ),
                end
            ]);
        }

        this.setState({ calendarMode: 'disabled', view: 'month', activeStartDate: skipTo ?? this.state.activeStartDate });
    };

    isTileDisabled = (props: CalendarTileProperties & { activeStartDate: Date; }) => {
        const startStamp = dateToTimestamp(props.date);
        const endStamp   = startStamp + 24 * 60; // TODO: !
        return !rangeIntersectsBounds([ startStamp, endStamp ], this.props.bounds as [number, number][]);
    };

    customRange = () => this.setState({ calendarMode: 'range' });
    customDate = () => this.setState({ calendarMode: 'day' });
    getDays = (days: number) => days * 24 * 60;
    getRelDate = (days: number, dayEnd: boolean) => {
        const { bounds } = this.props;
        const lastDay = parseTimestamp(bounds[bounds.length - 1][1] as number);
        lastDay.setHours(0, 0, 0, 0);

        const result = new Date(new Date(lastDay.getTime()).setDate(lastDay.getDate() - days));

        if (dayEnd) {
            result.setHours(23, 59, 59, 999);
        }

        return Math.min(dateToTimestamp(result), bounds[bounds.length - 1][1] as number);
    }

    onViewChange = ({ view }: ViewCallbackProperties) => this.setState({ view });
    onActiveStartDateChange = (props: ViewCallbackProperties) => this.setState({ activeStartDate: props.activeStartDate });

    public render() {
        const { value, disabled, graphs } = this.props;
        const { calendarMode } = this.state;

        return (
            <div className='range-picker'>
                <Form.Control name='timeRange' readOnly autoComplete='off' value={this.getRangeString()}></Form.Control>
                <Dropdown as={ButtonGroup} className='my-2'>
                    <Button disabled={disabled} onClick={this.onRangeButton} data-from={this.getRelDate(0, false)} data-to={this.getRelDate(0, true)}>{t('modals.addGraph.lastDay')}</Button>
                    <Button disabled={disabled} onClick={this.onRangeButton} data-from={this.getRelDate(1, false)} data-to={this.getRelDate(1, true)}>{t('modals.addGraph.prevDay')}</Button>
                    <Button disabled={disabled} onClick={this.onRangeButton} data-from={this.getRelDate(2, false)} data-to={this.getRelDate(2, true)}>{t('modals.addGraph.prevPrevDay')}</Button>
                    <Button disabled={disabled} onClick={this.customDate}>{t('modals.addGraph.customDate')}</Button>
                </Dropdown>

                <Dropdown as={ButtonGroup} className='mb-2'>
                    <Button disabled={disabled} variant='warning' onClick={this.onRangeButton} data-range={this.getDays(1)}>{t('modals.addGraph.day')}</Button>
                    <Button disabled={disabled} variant='warning' onClick={this.onRangeButton} data-range={this.getDays(7)}>{t('modals.addGraph.week')}</Button>
                    <Button disabled={disabled} variant='warning' onClick={this.onRangeButton} data-range={this.getDays(28)}>{t('modals.addGraph.month')}</Button>
                    <Button disabled={disabled} variant='warning' onClick={this.customRange}>{t('modals.addGraph.customRange')}</Button>

                    <Dropdown.Toggle disabled={disabled} variant='warning' />
                    <Dropdown.Menu>
                        <Dropdown.Item onClick={this.onRangeButton} data-range={this.getDays(91)} >{t('modals.addGraph.quarter')}</Dropdown.Item>
                        <Dropdown.Item onClick={this.onRangeButton} data-range={this.getDays(183)}>{t('modals.addGraph.halfYear')}</Dropdown.Item>
                        <Dropdown.Item onClick={this.onRangeButton} data-range={this.getDays(365)}>{t('modals.addGraph.year')}</Dropdown.Item>
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

                <Calendar
                    className={calendarMode === 'disabled' ? 'disabled' : undefined}
                    value={value?.map(v => parseTimestamp(v))}
                    returnValue="range"
                    selectRange={calendarMode === 'range'}
                    tileDisabled={this.isTileDisabled}
                    
                    activeStartDate={this.state.activeStartDate}
                    view={this.state.view}

                    onChange={calendarMode !== 'disabled' ? this.onChange : undefined}
                    onActiveStartDateChange={this.onActiveStartDateChange}
                    onViewChange={this.onViewChange}
                />
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
    calendarMode: 'day' | 'range' | 'disabled',
    activeStartDate: Date,
    view: Detail,
}

export default connect(stateProps, dispatchProps)(DateTimeRange);
