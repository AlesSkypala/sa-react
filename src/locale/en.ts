import * as hp from './en_hp';

const en_lang = {
    unsavedWork: 'You have unsaved work. Are you sure you want to leave?',

    header: {
        addGraph: 'Add a graph',
        minimizeGraphs: 'Minimize all graphs',
        removeGraphs: 'Remove all graphs',
        toggleLock: 'Lock/unlock the layout',
    },

    sidemenu: {
        traces: 'Traces',
        choose: 'Choose a graph',
    },

    stacking: {
        horizontal: 'Horizontal',
        vertical: 'Vertical',
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
        cloneActive: 'Clone Active Series'
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
            traceCount: 'Trace count',
            description: 'Description',

            singleGraph: 'As a single graph',

            day: 'Day',
            week: 'Week',
            month: 'Month',
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
            body: 'Do you really want to remove this graph?'
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

        traceSearch: {
            title: 'Search traces',
            term: 'Search term',
        },
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
    }
};

export default en_lang;