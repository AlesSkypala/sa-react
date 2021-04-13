type DataJobState = 
    | 'init'
    | 'pending'
    | 'completed'
    | 'error'
;

type DataJobResult = {
    loadedTraces?: Trace['id'][];
};