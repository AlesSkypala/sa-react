import * as React from 'react';
import Calendar from 'react-calendar';

import 'react-calendar/dist/Calendar.css';

// TODO: Time select
const toTimeString = (date: Date) => `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
const clamp = (date: Date, min: Date, max: Date) => {
    if (min > date) return min;
    if (max < date) return max;
    return date;
};

class DateTimeRange
    extends React.PureComponent<Props, State> {
    public state: State = { };

    onChange = (value: Date | Date[]) => {
        this.props.onChange && Array.isArray(value) && this.props.onChange(value[0], value[1]);
    }
    onFromChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const date = event.currentTarget.valueAsDate;

        if (!date) {
            return;
        }
        
        const { from, to, minDate, maxDate } = this.props;
        date.setFullYear(from.getFullYear());
        date.setMonth(from.getMonth());
        date.setDate(from.getDate());

        console.log(date);

        this.props.onChange && this.props.onChange(clamp(date, minDate, maxDate), to);
    };
    onToChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const date = event.currentTarget.valueAsDate;

        if (!date) {
            return;
        }

        const { from, to, minDate, maxDate } = this.props;
        date.setFullYear(to.getFullYear());
        date.setMonth(to.getMonth());
        date.setDate(to.getDate());

        this.props.onChange && this.props.onChange(from, clamp(date, minDate, maxDate));
    };


    public render() {
        const { minDate, maxDate, from, to } = this.props;
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '1rem' }}>
                {/* <Calendar minDate={minDate} maxDate={maxDate} /> */}
                <Calendar minDate={minDate} maxDate={maxDate} value={[ from, to ]} onChange={this.onChange} returnValue="range" selectRange />
                <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-evenly'}}>
                    <input type='time' value={toTimeString(from)} onChange={this.onFromChange}/>
                    <input type='time' value={toTimeString(to)}   onChange={this.onToChange}/>
                </div>
            </div>
        );
    }
}

export interface Props {
    from: Date;
    to: Date;

    minDate: Date;
    maxDate: Date;

    onChange?(from: Date, to: Date): void;
}

export interface State {
    
}

export default DateTimeRange;