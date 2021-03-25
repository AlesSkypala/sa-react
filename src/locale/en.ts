const en_lang = {
    unsavedWork: 'You have unsaved work. Are you sure you want to leave?',

    header: {
        addGraph: 'Add a graph',
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
        xLabel: 'X axis label',
        yLabel: 'Y axis label',

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

            singleGraph: 'As a single graph',

            day: 'Day',
            week: 'Week',
            month: 'Month',
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
    }
};

export default en_lang;