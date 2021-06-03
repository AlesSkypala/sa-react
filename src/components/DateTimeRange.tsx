import * as React from 'react';
import { Button, ButtonGroup, Dropdown, Form, Overlay, Popover } from 'react-bootstrap';
import { parseTimestamp, dateToTimestamp } from '../utils/datetime';
import * as DateTime from '../utils/datetime';
import DayPicker, { DayModifiers } from 'react-day-picker';
import { t } from '../locale';
import moment from 'moment';
import { connect, StateProps } from '../redux';
import { Range } from 'react-range';

import 'react-day-picker/lib/style.css';
import './DateTimeRange.scss';

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

    onChange = (date: Date, modifs: DayModifiers) => {
        if (modifs.disabled) return;

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
                if (DateTime.isSameDay(date, parseTimestamp(value[1]))) {
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
    onTimeChange = (from?: number, to?: number) => {
        function parseStamp(val: number, baseTimestamp: number) {
            const date = parseTimestamp(baseTimestamp);
            date.setHours(Math.floor(val / 60), val % 60, 0, 0);
            return dateToTimestamp(date);
        }

        const value = this.props.value as [ number, number ];

        if (value && this.props.onChange) {
            this.props.onChange([
                from !== undefined ? parseStamp(from, value[0]) : value[0],
                to   !== undefined ? parseStamp(to  , value[1]) : value[1],
            ]);
        }
    }

    public* generateDisabled() {
        const bounds = this.props.bounds as [number, number][];

        yield { before: DateTime.getDay(parseTimestamp(bounds[0][0]), 0) };
        for (let i = 1; i < bounds.length; ++i) {
            if (DateTime.getDay(parseTimestamp(bounds[i - 1][1])).getTime() === DateTime.getDay(parseTimestamp(bounds[i][0])).getTime()) continue;

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

        console.log([ ...this.generateDisabled() ]);

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
                    <Button disabled={disabled} variant='warning' onClick={this.onRangeButton} data-range={this.getDays(2)}>{t('modals.addGraph.twodays')}</Button>
                    <Button disabled={disabled} variant='warning' onClick={this.onRangeButton} data-range={this.getDays(4)}>{t('modals.addGraph.fourdays')}</Button>

                    <Dropdown.Toggle disabled={disabled} variant='warning' />
                    <Dropdown.Menu>
                        <Dropdown.Item onClick={this.onRangeButton} data-range={this.getDays(7)}  >{t('modals.addGraph.week')}</Dropdown.Item>
                        <Dropdown.Item onClick={this.onRangeButton} data-range={this.getDays(28)} >{t('modals.addGraph.month')}</Dropdown.Item>
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
    onChange?(from?: number, to?: number): void;
};

type DayPopoverState = {
    open: boolean;

    fromVal: number,
    toVal: number,
}

class DayPopover extends React.Component<DayPopoverProps, DayPopoverState> {
    public state: DayPopoverState = {
        open: false,

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

    onHover =   () => this.setState({ open: true });
    onUnhover = () => this.setState({ open: false });

    onRangeChange = (vals: number[]) => {
        const { from, to } = this.props;
        this.setState({
            fromVal: from ? Math.min(vals[0], this.state.toVal) : this.state.fromVal,
            toVal:   to ? Math.max(from ? vals[1] : vals[0], this.state.fromVal) : this.state.toVal,
        });
    }
    onRangeDrop = () => {
        const { onChange, from, to } = this.props;
        onChange && onChange(from ? this.state.fromVal : undefined, to ? this.state.toVal : undefined);
    }

    onFromChangeTime = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { onChange } = this.props;
        onChange && onChange( Math.min(Math.floor(e.currentTarget.valueAsNumber / 60_000), this.state.toVal), undefined);
    }
    onToChangeTime = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { onChange } = this.props;
        onChange && onChange(undefined, Math.max(Math.floor(e.currentTarget.valueAsNumber / 60_000), this.state.fromVal));
    }

    blockEvent = (e: React.MouseEvent) => { e.stopPropagation(); }
    numToTimeStamp = (num: number) => `${String(Math.floor(num / 60)).padStart(2, '0')}:${String(num % 60).padStart(2, '0')}`;

    public render() {
        const { from, to, date } = this.props;
        const id = `time-sel${from ? '-from' : ''}${to ? '-to' : ''}`;
        const { fromVal, toVal } = this.state;

        const rangeVal: number[] = [];

        from && rangeVal.push(fromVal);
        to   && rangeVal.push(toVal);

        let trackGradient = '';

        if (rangeVal.length == 2) {
            const start = `${100 * fromVal / (24 * 60 - 1)}%`;
            const end   = `${100 * toVal / (24 * 60 - 1)}%`;
            trackGradient = `linear-gradient(to right, var(--gray) 0%, var(--gray) ${start}, var(--blue) ${start}, var(--blue) ${end}, var(--gray) ${end}, var(--gray) 100%)`;
        } else if (from) {
            const start = `${100 * fromVal / (24 * 60 - 1)}%`;
            trackGradient = `linear-gradient(to right, var(--gray) 0%, var(--gray) ${start}, var(--blue) ${start}, var(--blue) 100%)`;
        } else if (to) {
            const end   = `${100 * toVal / (24 * 60 - 1)}%`;
            trackGradient = `linear-gradient(to right, var(--blue) 0%, var(--blue) ${end}, var(--gray) ${end}, var(--gray) 100%)`;
        }

        return (
            <div onPointerEnter={this.onHover} onPointerLeave={this.onUnhover} ref={this.ref}>
                {date.getDate()}
                <Overlay target={this.ref.current} show={this.state.open} placement='top'>
                    {props => (
                        <Popover {...props} id={id} onClick={this.blockEvent}>
                            <Popover.Content>
                                <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', marginBottom: '0.5rem' }}>
                                    {from && (<Form.Control
                                        type='time'
                                        className='mx-1'
                                        value={this.numToTimeStamp(fromVal)}
                                        onChange={this.onFromChangeTime}
                                    />)}
                                    {to && (<Form.Control
                                        type='time'
                                        className='mx-1'
                                        value={this.numToTimeStamp(toVal)}
                                        onChange={this.onToChangeTime}
                                    />)}
                                </div>
                                <Range
                                    min={0}
                                    max={24 * 60 - 1}
                                    step={1}
                                    values={rangeVal}
                                    onChange={this.onRangeChange}
                                    onFinalChange={this.onRangeDrop}

                                    renderTrack={({ props, children }) => (
                                        <div
                                            {...props}
                                            style={{
                                                ...props.style,
                                                height: '6px',
                                                width: '100%',
                                                background: trackGradient
                                            }}
                                        >
                                            {children}
                                        </div>
                                    )}
                                    renderThumb={({ props }) => (
                                        <div
                                            {...props}
                                            style={{
                                                ...props.style,
                                                height: '1rem',
                                                width: '1rem',
                                                borderRadius: '0.5rem',
                                                backgroundColor: 'var(--blue)'
                                            }}
                                        />
                                    )}
                                />
                            </Popover.Content>
                        </Popover>
                    )}
                </Overlay>
            </div>
        );
    }
}

export default connect(stateProps, dispatchProps)(DateTimeRange);
