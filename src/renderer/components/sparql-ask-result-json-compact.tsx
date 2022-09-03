import { h, FunctionComponent } from 'preact';
import './sparql-result-json-compact.css';
import { SparqlAskResult } from '../model/sparql-result-json.model';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const SparqlAskResultJsonCompact: FunctionComponent<{
  sparqlResult: SparqlAskResult;
}> = ({ sparqlResult }) => (
  <div class='book_table'>
    <div class='book_col'>
      <div class='book_header'>
        {sparqlResult.boolean ? 'yes' : 'no'}
      </div>
    </div>
  </div>
);
