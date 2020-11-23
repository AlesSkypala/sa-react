declare module 'plotly.js-gl2d-dist' {
    const obj = {};
    export default obj;
}

declare namespace ReactBootstrapDaterangepicker {

    export interface EventHandler { (event?: any, picker?: any): any; }

    export interface Props extends daterangepicker.Options{
        onShow?: EventHandler;
        onHide?: EventHandler;
        onShowCalendar?: EventHandler;
        onHideCalendar?: EventHandler;
        onApply?: EventHandler;
        onCancel?: EventHandler;
        onEvent?: EventHandler;
        onCallback?(start: any, end: eny, label: string): void;
        
        initialSettings: Partial<InitialSettings>;
    }

    interface InitialSettings {
        startDate: Date | string,
        endDate: Date | string,
        minDate: Date | string,
        maxDate: Date | string,
        timePicker: boolean;
        timePicker24Hour: boolean;

    }

    export class DateRangePicker extends React.Component<Props> { }
}

declare var DateRangePicker: typeof ReactBootstrapDaterangepicker.DateRangePicker;

declare module "react-bootstrap-daterangepicker" {
    export = DateRangePicker;
}
