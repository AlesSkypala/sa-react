import * as React from 'react';
import { Button, ButtonGroup, Dropdown, Form } from 'react-bootstrap';
import Calendar, { CalendarTileProperties, Detail, ViewCallbackProperties } from 'react-calendar';
import { dateToTimestamp, getDayFromEnd, parseTimestamp, rangeIntersectsBounds } from '../utils/datetime';

import { t } from '../locale';
import moment from 'moment';
import { connect, StateProps } from '../redux';

import 'react-calendar/dist/Calendar.css';
import './DateTimeRange.css';

// TODO: Time select
// const toTimeString = (date: Date) => `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
// const clamp = (date: Date, min: Date, max: Date) => {
//     if (min > date) return min;
//     if (max < date) return max;
//     return date;
// };

const numclamp = (val: number, min: number, max: number) => Math.max(Math.min(val, max), min);

const dateFormat = 'HH:mm DD.MM.YYYY';

class DateTimeRange
    extends React.PureComponent<Props, State> {
    public state: State = { 
        activeStartDate: undefined,
        view: 'month',
    };

    onChange = (value: Date | Date[]) => {
        const { bounds } = this.props;
        const minValue = bounds[0][0] as number;
        const maxValue = bounds[bounds.length - 1][1] as number;

        this.props.onChange && Array.isArray(value) && this.props.onChange(value.map(v => numclamp(dateToTimestamp(v), minValue, maxValue)) as Graph['xRange']);
    }

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

        this.setState({ view: 'month', activeStartDate: skipTo ?? this.state.activeStartDate });
    };

    isTileDisabled = (props: CalendarTileProperties & { activeStartDate: Date; }) => {
        if (props.view !== 'month') return false;

        const startStamp = dateToTimestamp(props.date);
        const endStamp   = startStamp + 24 * 60 - 1; // TODO: !
        return !rangeIntersectsBounds([ startStamp, endStamp ], this.props.bounds as [number, number][]);
    };

    getDays = (days: number) => days * 24 * 60;
    getRelDate = (days: number) => {
        const { bounds } = this.props;
        const [ from, to ] = getDayFromEnd(bounds[bounds.length - 1] as [number, number], days);

        return {
            'data-from': from,
            'data-to': to,
            disabled: this.props.disabled || from === to,
        };
    }

    onViewChange = ({ view }: ViewCallbackProperties) => this.setState({ view });
    onActiveStartDateChange = (props: ViewCallbackProperties) => this.setState({ activeStartDate: props.activeStartDate });

    public render() {
        const { value, disabled, graphs, bounds } = this.props;
        const maxDate = parseTimestamp(bounds[bounds.length - 1][1] as number);

        return (
            <div className='range-picker'>
                <Form.Control name='timeRange' readOnly autoComplete='off' value={this.getRangeString()}></Form.Control>
                <Dropdown as={ButtonGroup} className='my-2'>
                    <Button onClick={this.onRangeButton} {...this.getRelDate(0)}>{t('modals.addGraph.lastDay')}</Button>
                    <Button onClick={this.onRangeButton} {...this.getRelDate(1)}>{t('modals.addGraph.prevDay')}</Button>
                    <Button onClick={this.onRangeButton} {...this.getRelDate(2)}>{t('modals.addGraph.prevPrevDay')}</Button>
                    <Button onClick={this.onRangeButton} {...this.getRelDate(3)}>{t('modals.addGraph.prevPrevDay')}</Button>
                    {/* <Button disabled={disabled} onClick={this.customDate}>{t('modals.addGraph.customDate')}</Button> */}
                </Dropdown>

                <Dropdown as={ButtonGroup} className='mb-2'>
                    <Button disabled={disabled} variant='warning' onClick={this.onRangeButton} data-range={this.getDays(1)}>{t('modals.addGraph.day')}</Button>
                    <Button disabled={disabled} variant='warning' onClick={this.onRangeButton} data-range={this.getDays(7)}>{t('modals.addGraph.week')}</Button>
                    <Button disabled={disabled} variant='warning' onClick={this.onRangeButton} data-range={this.getDays(28)}>{t('modals.addGraph.month')}</Button>
                    {/* <Button disabled={disabled} variant='warning' onClick={this.customRange}>{t('modals.addGraph.customRange')}</Button> */}

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
                    value={value?.map(v => parseTimestamp(v))}
                    returnValue="range"
                    selectRange
                    tileDisabled={this.isTileDisabled}
                    maxDate={maxDate}
                    
                    activeStartDate={this.state.activeStartDate ?? (value ? parseTimestamp(value[1]) : undefined)}
                    view={this.state.view}

                    onChange={this.onChange}
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
    activeStartDate: Date | undefined,
    view: Detail,
}

export default connect(stateProps, dispatchProps)(DateTimeRange);
