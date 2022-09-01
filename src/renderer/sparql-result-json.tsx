// the MIME-Type is application/sparql-results+json"

import { ActivationFunction, OutputItem } from 'vscode-notebook-renderer';
import { h, render } from 'preact';
import { SparqlResultJson } from './components/sparql-result-json';
import { SparqlResultJsonCompact } from './components/sparql-result-json-compact';
import { SparqlAskResultJson } from './components/sparql-ask-result-json';

export const activate: ActivationFunction = () => ({
  renderOutputItem(outputItem: OutputItem, element: HTMLElement) {
    const outputItemJson = outputItem.json();
    if (outputItemJson.hasOwnProperty("boolean")) {
      render(<SparqlAskResultJson sparqlResult={outputItemJson} />, element);
    } else {
      if (outputItemJson._compact) {
        render(<SparqlResultJsonCompact sparqlResult={outputItemJson} />, element);
      }
      else {
        render(<SparqlResultJson sparqlResult={outputItemJson} />, element);
      }
    }
  },
});