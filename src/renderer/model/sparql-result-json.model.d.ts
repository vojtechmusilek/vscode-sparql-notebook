export interface SparqlAskResult {
    boolean: boolean;
}
export interface SparqlJsonResult {
    _compact: boolean,
    head: {
        vars: string[];
    };
    results: {
        bindings: any[];
    };
}
