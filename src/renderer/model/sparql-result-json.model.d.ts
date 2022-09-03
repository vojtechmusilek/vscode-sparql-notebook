export interface SparqlAskResult {
    boolean: boolean;
}
export interface SparqlJsonResult {
    _settings: any,
    head: {
        vars: string[];
    };
    results: {
        bindings: any[];
    };
}
