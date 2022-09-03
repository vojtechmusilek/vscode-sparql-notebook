import { h, FunctionComponent } from 'preact';
import './sparql-result-json-compact.css';
import { SparqlJsonResult } from '../model/sparql-result-json.model';


// eslint-disable-next-line @typescript-eslint/naming-convention
export const SparqlResultJsonCompact: FunctionComponent<{
  sparqlResult: SparqlJsonResult;
}> = ({ sparqlResult }) => (
  <div class='book_table'>
    {sparqlResult.head.vars.map((heading: string) => (
      <div class='book_col'>
        <div class='book_header'>
          {heading}
        </div>
        {sparqlResult.results.bindings.map((binding: any) => (
          <div onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} class={getRowClasses(binding)}>
            {formatCell(binding[heading])}
          </div>
        ))}
      </div>
    ))}
  </div>
);

function onMouseEnter(item: any) {
  let test: HTMLCollectionOf<Element> = (document.getElementsByClassName(item.target.classList[1]) as HTMLCollectionOf<Element>);
  for (let i = 0; i < test.length; i++) {
    const element = test.item(i);
    element?.setAttribute("style", "background-color: var(--table-hover-color);")
  }
}

function onMouseLeave(item: any) {
  let test: HTMLCollectionOf<Element> = (document.getElementsByClassName(item.target.classList[1]) as HTMLCollectionOf<Element>);
  for (let i = 0; i < test.length; i++) {
    const element = test.item(i);
    element?.setAttribute("style", "")
  }
}

let rowIndexes: any = {};
let rowIndex = 0;

function getRowClasses(input: string): string {
  const key = JSON.stringify(input);
  if (rowIndexes.hasOwnProperty(key)) {
    return "book_cell " + rowIndexes[key];
  }

  rowIndexes[key] = "gen_row_" + rowIndex;
  rowIndex++;
  return getRowClasses(input);
}

function formatCell(member: any) {
  if (member === undefined) {
    // blank space U+00a0
    return <span> </span>
  }

  const value = escapeValue(member.value);
  const type = member.type;

  if (type == "literal") {
    return <span class='book_member_literal'>"{value}"</span>
  }

  if (value.startsWith("http")) {
    return <span class='book_member_uri'>
      <span class='book_monofont'>&lt;</span>
      <u>{value}</u>
      <span class='book_monofont'>&gt;</span>
    </span>
  }

  const valueSplit = value.split(/:(.*)/s)
  const prefix = valueSplit[0]
  const name = valueSplit[1]

  return <span>
    <span class='book_member_prefix'>{prefix}:</span>
    <span class='book_member_name'>{name}</span>
  </span>
}

function escapeValue(str: any) {
  return str?.replaceAll("<", "&lt;")?.replaceAll(">", "&gt;") ?? ""
}