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
    onTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const date = event.currentTarget.valueAsDate;
    
        const [ from, to ] = this.props.value ?? [ undefined, undefined ];
        const [ minDate, maxDate ] = this.props.bounds ?? [ undefined, undefined ];

        if (!date || !this.props.onChange || !from || !to) {
            return;
        }

        if (event.currentTarget.dataset.part === 'from') {
            date.setFullYear(from.getFullYear());
            date.setMonth(from.getMonth());
            date.setDate(from.getDate());
            this.props.onChange(minDate && maxDate ? clamp(date, minDate, maxDate) : date, to);
        } else {
            date.setFullYear(to.getFullYear());
            date.setMonth(to.getMonth());
            date.setDate(to.getDate());
            this.props.onChange(from, minDate && maxDate ? clamp(date, minDate, maxDate) : date);
        }
    };

    public render() {
        const [ from, to ] = this.props.value ?? [ undefined, undefined ];
        const [ minDate, maxDate ] = this.props.bounds ?? [ undefined, undefined ];

        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Calendar minDate={minDate} maxDate={maxDate} value={from && to && [ from, to ]} onChange={this.onChange} returnValue="range" selectRange />
                <div style={{ display: 'flex', width: '100%', flexDirection: 'row', justifyContent: 'stretch'}}>
                    <input disabled={this.props.disabled} style={{ flexGrow: 1 }} type='time' data-part='from' value={from ? toTimeString(from) : ''} onChange={this.onTimeChange}/>
                    <input disabled={this.props.disabled} style={{ flexGrow: 1 }} type='time' data-part='to'   value={to   ? toTimeString(to) : ''}   onChange={this.onTimeChange}/>
                </div>
            </div>
        );
    }
}

export interface Props {
    value?: [ Date, Date ];
    bounds?: [ Date, Date ];

    disabled?: boolean;

    onChange?(from: Date, to: Date): void;
}

export interface State {
    
}

export default DateTimeRange;