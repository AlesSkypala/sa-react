import * as hp from './en_hp';

const en_lang = {
    unsavedWork: 'You have unsaved work. Are you sure you want to leave?',

    header: {
        addGraph: 'Add a graph',
        minimizeGraphs: 'Minimize all graphs',
        removeGraphs: 'Remove all graphs',
        toggleLock: 'Lock/unlock the layout',
        settings: 'Application settings',
    },

    sidemenu: {
        traces: 'Traces',
        choose: 'Choose a graph',
    },

    stacking: {
        horizontal: 'Horizontal',
        vertical: 'Vertical',
        grid: 'Grid',
        freeform: 'Freeform',
    },

    graph: {
        new: 'New graph',
        title: 'Graph title',
        xLabel: 'x axis label',
        yLabel: 'y axis label',

        xAxis: 'x axis',
        yAxis: 'y axis',

        pendingJobs: '{{count}} job is running',
        pendingJobs_plural: '{{count}} jobs are running',
        failedJobs:  '{{count}} job has failed',
        failedJobs_plural:  '{{count}} jobs have failed',

        noTraces: 'No active traces',
        redrawNotice: 'The graph will be rerendered after you lock the layout',
        cloneAll: 'Clone All Series',
        cloneActive: 'Clone Active Series',
        ldevSelect: 'LDEV Select',

        error: 'A critical error has occurred while rendering the graph:',
    },

    modals: {
        cancel: 'Cancel',
        back: 'Back',
        yes: 'Yes',
        no: 'No',
        add: 'Add',
        ok: 'Ok',
        save: 'Save',

        addGraph: {
            title: 'Add a graph',
            noRange: 'Unselected',
            loading: 'Loading traces',
            source: 'Data source',
            range: 'Time range',
            datasets: 'Datasets',
            traceCount: 'Up to {{count}} trace',
            traceCount_plural: 'Up to {{count}} traces',
            description: 'Description',

            singleGraph: 'As a single graph',

            lastDay: 'Last day',
            prevDay: '-1d',
            prevPrevDay: '-2d',
            customDate: 'Custom',

            day: '24h',
            twodays: '48h',
            fourdays: '96h',
            week: '7d',
            month: '28d',
            customRange: 'Custom',
            quarter: 'Quarter',
            halfYear: 'Half year',
            year: 'Year',
            copy: 'Copy existing',
        },

        editGraph: {
            title: 'Edit the graph {{name}}',
        },

        removeGraph: {
            title: 'Delete the graph {{name}}',
            body: 'Do you really want to remove this graph?',
            dontAsk: 'Don\'t ask me next time.',
        },

        removeGraphs: {
            title: 'Delete all graphs',
            body: 'Do you really want to remove the graph?',
            body_plural: 'Do you really want to remove all {{count}} graphs?',
        },

        ldevMap: {
            title: 'LDEV Map',
            loading: 'Loading the LDEV',
        },

        ldevSelect: {
            title: 'LDEV Select',
            activeOnly: 'Show active only',
            search: 'Search keywords...',

            hostgroup: 'Host Group',
            port: 'Host Port',
            pool: 'Pool',
            ecc: 'Parity Group',
            mpu: 'MPU',
            wwn: 'WWN',
        },

        traceSearch: {
            title: 'Search traces',
            term: 'Search term',
        },

        settings: {
            title: 'Application settings',
            darkMode: 'Dark mode',
            askGraphClose: 'Show confirmation dialog when closing individual graphs',
            activeContexts: 'Max active contexts',
        }
    },

    datasets: {
        titles: {
            hp: hp.titles,
            dummy: {
                testset: 'Test set',
                zeros: 'Zeros',
                peak: 'Single peak',
                dense: 'Dense set',
                extradense: 'Extremely dense set',
            },
        },
        descriptions: {
            hp: hp.descriptions,
            dummy: {
                testset: 'Contains random points.',
                zeros: 'Contains only zeros.',
                peak: 'Contains a single gaussian peak at the center of the graph.',
                dense: 'Dense random dataset.',
                extradense: 'Even denser random dataset',
            },
        },

        items: 'Items: {{count}}',
        id: 'ID: {{id}}',
        path: 'Path: {{path}}',
        favorites: 'Favorites',

        avg: 'Average of {{count}} trace',
        avg_plural: 'Average of {{count}} traces',
        sum: 'Sum of {{count}} trace',
        sum_plural: 'Sum of {{count}} traces',
    },

    error: {
        title: 'An unexpected error has occurred!',
        directions: 'Please, save your console log (enter the developer menu by pressing F12 and follow the instructions in the gif above) and email it to us.'
    }
};

export default en_lang;