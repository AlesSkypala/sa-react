declare module 'plotly.js-gl2d-dist' {
    const obj = {};
    export default obj;
}

declare module "ml-savitzky-golay-generalized" {
    interface SGOptions {
        windowSize: number = 9;
        derivative: number = 0;
        polynomial: number = 3;
    }

    export default function(dataY: number[], deltaXorX: number | number[], options?: Optional<SGOptions>): number[];

}

declare module 'worker-loader!*' {
    class WebpackWorker extends Worker {
        constructor();
    }

    export = WebpackWorker;
}

declare module 'react-advanced-datetimerange-picker' {
    type Moment = import('moment').Moment;

    export interface DateTimeRangeContinerProps {
        ranges: {
            [key: string]: [ Moment, Moment ];
        };
        start: Moment;
        end: Moment;
        local: {
            format: string;
            sundayFirst?: boolean;
            days?: string[],
            months?: string[],
            fromDate?: string,
            toDate?: string,
            selectingFrom?: string,
            selectingTo?: string,
            maxDate?: string,
            close?: string,
            apply?: string,
            cancel?: string,
        };

        applyCallback(from: Moment, to: Moment);
        maxDate?: Moment;
        rangeCallback?(idx: number, value: any);
        autoApply?: boolean;
        descendingYears?: boolean;
        years?: number[];

        smartMode?: boolean;
        pastSearchFriendly?: boolean;
        // style
        darkMode?: boolean;
        noMobileMode?: boolean;
        forceMobileMode?: boolean;
        twelveHoursClock?: boolean;
        standaloneMode?: boolean;
        leftMode?: boolean;
    }

    class DateTimeRangeContainer
    extends React.Component<DateTimeRangeContinerProps>{

    }

    export default DateTimeRangeContainer;
}