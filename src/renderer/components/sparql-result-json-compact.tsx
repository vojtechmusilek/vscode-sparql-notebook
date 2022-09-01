import { h, FunctionComponent } from 'preact';
import './sparql-result-json-compact.css';
import { SparqlJsonResult } from '../model/sparql-result-json.model';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const SparqlResultJsonCompact: FunctionComponent<{
  sparqlResult: SparqlJsonResult;
}> = ({ sparqlResult }) => (
  <div class="dtable">
    {sparqlResult.head.vars.map((heading: string) => (
      <div class="dcol">
        <div class="dheader">
          {heading}
        </div>
        {sparqlResult.results.bindings.map((binding: any) => (
          <div class="dcell">
            <Cell member={binding[heading]}></Cell>
          </div>
        ))}
      </div>
    ))}
  </div>
);

const Cell: FunctionComponent<{
  member: any;
}> = ({ member }) => (

  member !== undefined && member.hasOwnProperty("_prefix")
    ?
    <span>
      <span class="dprefix">{member._prefix + ":" ?? ""}</span>
      <span>{escapeValue(member._valueWithoutPrefix)}</span>
    </span>
    :
    <span>
      {escapeValue(member.value)}
    </span>

);

function escapeValue(str: any) {
  return str?.replaceAll("<", "&lt;")?.replaceAll(">", "&gt;") ?? ""
}