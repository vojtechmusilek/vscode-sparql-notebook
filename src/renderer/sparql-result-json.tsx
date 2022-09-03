// the MIME-Type is application/sparql-results+json"

import { ActivationFunction, OutputItem } from 'vscode-notebook-renderer';
import { h, render } from 'preact';
import { SparqlResultJson } from './components/sparql-result-json';
import { SparqlResultJsonCompact } from './components/sparql-result-json-compact';
import { SparqlAskResultJson } from './components/sparql-ask-result-json';
import { SparqlAskResultJsonCompact } from './components/sparql-ask-result-json-compact';

export const activate: ActivationFunction = () => ({
  renderOutputItem(outputItem: OutputItem, element: HTMLElement) {
    const outputItemJson = outputItem.json();
    const tableV2 = outputItemJson._settings.tableStyleV2;
    if (outputItemJson.hasOwnProperty("boolean")) {
      if (tableV2) {
        render(<SparqlAskResultJsonCompact sparqlResult={outputItemJson} />, element);
      }
      else {
        render(<SparqlAskResultJson sparqlResult={outputItemJson} />, element);
      }
    } else {
      if (tableV2) {
        render(<SparqlResultJsonCompact sparqlResult={outputItemJson} />, element);
      }
      else {
        render(<SparqlResultJson sparqlResult={outputItemJson} />, element);
      }
    }
  },
});