import { h, FunctionComponent } from 'preact';
import './sparql-result-json-compact.css';
import { SparqlAskResult } from '../model/sparql-result-json.model';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const SparqlAskResultJsonCompact: FunctionComponent<{
  sparqlResult: SparqlAskResult;
}> = ({ sparqlResult }) => (
  <div class='dtable'>
    <div class='dcol'>
      <div class='dheader'>
        {sparqlResult.boolean ? 'yes' : 'no'}
      </div>
    </div>
  </div>
);
