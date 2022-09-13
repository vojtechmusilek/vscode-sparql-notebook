import { h, FunctionComponent } from 'preact';
import './sparql-result-json-compact.css';
import { SparqlJsonResult } from '../model/sparql-result-json.model';


// eslint-disable-next-line @typescript-eslint/naming-convention
export const SparqlResultJsonCompact: FunctionComponent<{
  sparqlResult: SparqlJsonResult;
}> = ({ sparqlResult }) => (
  <div class='book_table'>
    {generateLineNumbers(sparqlResult)}
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

let rowIndexes: any = {};
let rowIndex = 0;
//blank space U+00a0
const blankSpace = " ";



function generateLineNumbers(sparqlResult: SparqlJsonResult) {
  if (!sparqlResult._settings.tableShowLineNumbers) {
    return;
  }

  let line = 1;
  return <div class='book_linenum_col'>
    <div class='book_header'>{blankSpace}</div>
    {sparqlResult.results.bindings.map((binding: any) => (
      <div onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} class={getRowClasses(binding)}>
        {line++}
      </div>
    ))}
  </div>
}

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
    element?.removeAttribute("style")
  }
}

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
    return <span>{blankSpace}</span>
  }

  const value = escapeValue(member.value);
  const type = member.type;

  if (type == "literal") {
    if (member.hasOwnProperty("datatype")) {
      const datatype = member.datatype.replace("http://www.w3.org/2001/XMLSchema#", "");

      if (datatype == "integer") {
        return <span class='book_member_literal_int'>{value}</span>
      }
      else if (datatype == "boolean") {
        return <span class='book_member_literal_bool'>{value}</span>
      }
      else {
        return <span>
          <span class='book_member_literal'>"{value}"</span>
          <span class='book_supfont'>
            <span class='book_member_uri'>^^</span>
            <span class='book_member_prefix'>xsd:</span>
            <span class='book_member_name'>{datatype}</span>
          </span>
        </span>
      }
    }

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