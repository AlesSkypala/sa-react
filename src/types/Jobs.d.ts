type DataJobState = 
    | 'init'
    | 'pending'
    | 'completed'
    | 'error'
;

type DataJobResult = {
    loadedTraces?: { [key: string]: number };
};