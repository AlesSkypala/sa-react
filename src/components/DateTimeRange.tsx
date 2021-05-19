import * as React from 'react';
import { Button, ButtonGroup, Dropdown, Form, Overlay, Popover } from 'react-bootstrap';
import { parseTimestamp, dateToTimestamp } from '../utils/datetime';
import * as DateTime from '../utils/datetime';
import DayPicker, { DayModifiers } from 'react-day-picker';
import { t } from '../locale';
import moment from 'moment';
import { connect, StateProps } from '../redux';

import 'react-day-picker/lib/style.css';
import './DateTimeRange.css';

const numclamp = (val: number, min: number, max: number) => Math.max(Math.min(val, max), min);
const dateFormat = 'HH:mm DD.MM.YYYY';

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
    month: Date,
}

class DateTimeRange
    extends React.PureComponent<Props, State> {
    public state: State = { 
        month: new Date(),
    };

    onChange = (date: Date) => {
        const { bounds, value } = this.props;
        const minValue = bounds[0][0] as number;
        const maxValue = bounds[bounds.length - 1][1] as number;
        date.setHours(0, 0, 0, 0);

        let next: Date[];

        if (value) {
            if (date < parseTimestamp(value[0])) {
                next = [ date, parseTimestamp(value[1]) ];
            } else {
                date.setHours(23, 59, 0, 0);
                if (date.getTime() === parseTimestamp(value[1]).getTime()) {
                    const start = new Date(date);
                    start.setHours(0, 0, 0, 0);
                    next = [ start, date ];
                } else {
                    next = [ parseTimestamp(value[0]), date ];
                }
            }
        } else {
            const to = new Date(date);
            to.setHours(23, 59, 0, 0);
            next = [ date, to ];
        }

        this.props.onChange && Array.isArray(value) && this.props.onChange(next.map(v => numclamp(dateToTimestamp(v), minValue, maxValue)) as Graph['xRange']);
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

        if (skipTo) {
            skipTo.setDate(1);
            skipTo.setHours(12, 0, 0, 0);
        }

        this.setState({ month: skipTo ?? this.state.month });
    };

    getDays = (days: number) => days * 24 * 60;
    getRelDate = (days: number) => {
        const { bounds } = this.props;
        const [ from, to ] = DateTime.getDayFromEnd(bounds[bounds.length - 1] as [number, number], days);

        return {
            'data-from': from,
            'data-to': to,
            disabled: this.props.disabled || from === to,
        };
    }

    onMonthChange = (month: Date) => this.setState({ month });
    onTimeChange = (type: 'from' | 'to', minute: number) => {
        const value = this.props.value as [ number, number ];

        if (value && this.props.onChange) {
            const date = parseTimestamp(value[type === 'from' ? 0 : 1]);
            date.setHours(Math.floor(minute / 60), minute % 60, 0, 0);

            this.props.onChange(type === 'from' ? [ dateToTimestamp(date), value[1] ] : [ value[0], dateToTimestamp(date) ]);
        }
    }

    public* generateDisabled() {
        const bounds = this.props.bounds as [number, number][];

        yield { before: DateTime.getDay(parseTimestamp(bounds[0][0]), 0) };
        for (let i = 1; i < bounds.length; ++i) {
            yield {
                after:  parseTimestamp(bounds[i - 1][1]),
                before: parseTimestamp(bounds[i][0]),
            };
        }
        yield { after: DateTime.getDay(parseTimestamp(bounds[bounds.length - 1][1]), 0) };
    }

    fromMonth = () => {
        const date = parseTimestamp(this.props.bounds[0][0] as number);
        date.setHours(0, 0, 0, 0);
        date.setDate(1);

        return date;
    }

    toMonth = () => {
        const date = parseTimestamp(this.props.bounds[this.props.bounds.length - 1][1] as number);
        date.setHours(0, 0, 0, 0);
        date.setDate(1);
        date.setMonth(date.getMonth());

        return date;
    }

    renderDay = (date: Date, modifiers: DayModifiers) => {
        if (modifiers.from || modifiers.to && !modifiers.outside) {
            return (
                <DayPopover
                    date={date}
                    from={Boolean(modifiers.from)}
                    to={Boolean(modifiers.to)}
                    bounds={this.props.bounds}
                    value={this.props.value}
                    onChange={this.onTimeChange}
                />
            );
        }

        return date.getDate();
    }

    public render() {
        const { disabled, graphs } = this.props;
        const value = this.props.value && { from: parseTimestamp(this.props.value[0]), to: parseTimestamp(this.props.value[1]) };

        return (
            <div className='range-picker'>
                <Form.Control name='timeRange' readOnly autoComplete='off' value={this.getRangeString()}></Form.Control>
                <Dropdown as={ButtonGroup} className='my-2'>
                    <Button onClick={this.onRangeButton} {...this.getRelDate(0)}>{t('modals.addGraph.lastDay')}</Button>
                    <Button onClick={this.onRangeButton} {...this.getRelDate(1)}>{t('modals.addGraph.prevDay')}</Button>
                    <Button onClick={this.onRangeButton} {...this.getRelDate(2)}>{t('modals.addGraph.prevPrevDay')}</Button>
                </Dropdown>

                <Dropdown as={ButtonGroup} className='mb-2'>
                    <Button disabled={disabled} variant='warning' onClick={this.onRangeButton} data-range={this.getDays(1)}>{t('modals.addGraph.day')}</Button>
                    <Button disabled={disabled} variant='warning' onClick={this.onRangeButton} data-range={this.getDays(7)}>{t('modals.addGraph.week')}</Button>
                    <Button disabled={disabled} variant='warning' onClick={this.onRangeButton} data-range={this.getDays(28)}>{t('modals.addGraph.month')}</Button>

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

                <DayPicker
                    disabledDays={[ ...this.generateDisabled() ]}
                    modifiers={value && { from: value.from, to: value.to }}
                    selectedDays={[ value?.from, value ]}
                    numberOfMonths={2}
                    fixedWeeks

                    fromMonth={this.fromMonth()}
                    toMonth={this.toMonth()}

                    todayButton='today'
                    firstDayOfWeek={1}
                    renderDay={this.renderDay}

                    month={DateTime.clampDate(this.state.month, this.fromMonth(), this.toMonth())}
                    onMonthChange={this.onMonthChange}
                    onDayClick={this.onChange}
                />
            </div>
        );
    }
}

type DayPopoverProps = {
    date: Date,
    bounds: Props['bounds'],

    from: boolean,
    to: boolean,

    value: Props['value']
    onChange?(type: 'from' | 'to', value: number): void;
};

type DayPopoverState = {
    hover: boolean;

    fromVal: number,
    toVal: number,
}

class DayPopover extends React.Component<DayPopoverProps, DayPopoverState> {
    public state: DayPopoverState = {
        hover: false,
        fromVal: 0,
        toVal: 24 * 60 - 1,
    }

    private ref = React.createRef<HTMLDivElement>();

    componentDidMount() {
        this.componentDidUpdate({ ...this.props, value: [0,0] });
    }

    componentDidUpdate(prevProps: DayPopoverProps) {
        if (prevProps.value !== this.props.value) {
            let [ fromVal, toVal ] = this.props.value ? 
                this.props.value.map((v: number) => parseTimestamp(v)).map(d => d.getHours() * 60 + d.getMinutes()) : [0, 24 * 60 - 1];

            if (!this.props.from) { fromVal = 0; }
            if (!this.props.to) { toVal = 24 * 60 - 1; }
            
            this.setState({ fromVal, toVal });
        }
    }

    onHover = () => this.setState({ hover: true });
    onUnhover = () => this.setState({ hover: false });

    onFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        this.setState({ fromVal: Math.min(e.currentTarget.valueAsNumber, this.state.toVal) });
    }

    onToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        this.setState({ toVal: Math.max(e.currentTarget.valueAsNumber, this.state.fromVal) });
    }

    onDropFrom = () => {
        const { onChange, from } = this.props;

        from && onChange && onChange('from', this.state.fromVal);
    }
    onDropTo = () => {
        const { onChange, to } = this.props;

        to && onChange && onChange('to', this.state.toVal);
    }

    blockEvent = (e: React.MouseEvent) => { e.stopPropagation(); }

    public render() {
        const { from, to, date } = this.props;
        const id = `time-sel${from ? '-from' : ''}${to ? '-to' : ''}`;
        const { fromVal, toVal } = this.state;

        return (
            <div onPointerMove={this.onHover} ref={this.ref} onMouseUp={this.blockEvent} onClick={this.blockEvent}>
                {date.getDate()}
                <Overlay target={this.ref.current} show={this.state.hover} placement='top' rootClose rootCloseEvent='click' onHide={this.onUnhover}>
                    {props => (
                        <Popover {...props} id={id}>
                            <Popover.Content>
                                {from && (<Form.Control
                                    type='range'
                                    min={0}
                                    max={24 * 60 - 1}

                                    value={fromVal}
                                    onChange={this.onFromChange}
                                    onPointerUp={this.onDropFrom}
                                />)}
                                {to && (<Form.Control
                                    type='range'
                                    min={0}
                                    max={24 * 60 - 1}

                                    value={toVal}
                                    onChange={this.onToChange}
                                    onPointerUp={this.onDropTo}
                                />)}
                            </Popover.Content>
                        </Popover>
                    )}
                </Overlay>
            </div>
        );
    }
}

export default connect(stateProps, dispatchProps)(DateTimeRange);
