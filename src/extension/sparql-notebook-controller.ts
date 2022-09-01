import * as vscode from "vscode";
import { globalConnection } from "./extension";
import { SparqlClient } from "./simple-client";

export class SparqlNotebookController {
  readonly controllerId = "sparql-notebook-controller-id";
  readonly notebookType = "sparql-notebook";
  readonly label = "Sparql Notebook";
  readonly supportedLanguages = ["sparql"];

  private readonly _controller: vscode.NotebookController;
  private _executionOrder = 0;

  constructor() {
    this._controller = vscode.notebooks.createNotebookController(
      this.controllerId,
      this.notebookType,
      this.label
    );

    this._controller.supportedLanguages = this.supportedLanguages;
    this._controller.supportsExecutionOrder = true;
    this._controller.executeHandler = this._execute.bind(this);
  }

  private _execute(
    cells: vscode.NotebookCell[],
    _notebook: vscode.NotebookDocument,
    _controller: vscode.NotebookController
  ): void {
    for (let cell of cells) {
      this._doExecution(cell);
    }
  }

  private async _doExecution(cell: vscode.NotebookCell): Promise<void> {
    const execution = this._controller.createNotebookCellExecution(cell);
    execution.executionOrder = ++this._executionOrder;
    execution.start(Date.now()); // Keep track of elapsed time to execute cell.

    let client: SparqlClient | null = null;
    const sparqlQuery = cell.document.getText();
    const documentEndpoint = this._getEndpointFromQuery(sparqlQuery);
    if (documentEndpoint) {
      client = new SparqlClient(documentEndpoint, "", "");
    } else {
      if (globalConnection.connection === null) {
        vscode.window.showErrorMessage("Not connected to a SPARQL Endpoint");
        execution.end(true, Date.now());
        return;
      }
      client = new SparqlClient(
        globalConnection.connection.data.endpointURL,
        globalConnection.connection.data.user,
        globalConnection.connection.data.passwordKey
      );
    }

    const query = cell.document.getText();
    const queryResult = await client.query(query).catch((error) => {
      execution.replaceOutput([
        new vscode.NotebookCellOutput([
          vscode.NotebookCellOutputItem.error(error),
        ]),
      ]);
      execution.end(true, Date.now());
      return;
    });

    // content type
    const contentType = queryResult.headers["content-type"].split(";")[0];
    const data = queryResult.data;

    if (contentType === "application/sparql-results+json") {
      if (data.hasOwnProperty("boolean")) {
        // sparql ask
        execution.replaceOutput([this._writeSparqlJsonResult(data)]);
      }
      else {
        // sparql select
        const dataWithNamespaces = this._parseNamespacesAndFormatBindings(data, query);
        execution.replaceOutput([this._writeSparqlJsonResult(dataWithNamespaces)]);
      }
    } else if (contentType === "text/turtle") {
      // sparql construct
      execution.replaceOutput([this._writeTurtleResult(data)]);
    } else if (contentType === "application/json") {
      // stardog is returning and error as json
      execution.replaceOutput([this._writeError(data)]);
    } else {
      console.log("unknown content type", contentType);
      console.log("data", data);
    }
    execution.end(true, Date.now());
  }

  private _writeTurtleResult(resultTTL: string): vscode.NotebookCellOutput {
    return new vscode.NotebookCellOutput([
      vscode.NotebookCellOutputItem.text(resultTTL, "text/plain"),
      vscode.NotebookCellOutputItem.text(
        `\`\`\`turtle\n${resultTTL}\n\`\`\``,
        "text/markdown"
      ),
    ]);
  }

  private _writeSparqlJsonResult(resultJson: any): vscode.NotebookCellOutput {
    return new vscode.NotebookCellOutput([
      this._writeJson(JSON.stringify(resultJson, null, "   ")),
      vscode.NotebookCellOutputItem.json(
        resultJson,
        "application/sparql-results+json"
      ),
    ]);
  }

  private _writeJson(jsonResult: any): vscode.NotebookCellOutputItem {
    return vscode.NotebookCellOutputItem.text(jsonResult, "text/x-json");
  }

  private _writeError(error: any): vscode.NotebookCellOutput {
    return new vscode.NotebookCellOutput([
      vscode.NotebookCellOutputItem.error({
        name: "SPARQL error",
        message: error.message,
      }),
    ]);
  }

  private _getEndpointFromQuery(sparqlQuery: string): string | undefined {
    const commentLines = sparqlQuery
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.startsWith("#"));
    const endpointExp = /\[endpoint=(.*)\]/gm;
    const endpoints: string[] = [];
    commentLines.every((comment: string) => {
      const match = endpointExp.exec(comment);
      if (match) {
        endpoints.push(match[1]);
        return false;
      }
      return true;
    });
    return endpoints.shift();
  }

  private _parseNamespacesAndFormatBindings(data: any, query: string): any {
    const configuration = vscode.workspace.getConfiguration("sparqlbook");
    const useNamespaces = configuration.get("useNamespaces");
    if (!useNamespaces) {
      return data;
    }

    // get namespaces from prefixes in query
    let namespaces: any = {};
    let nsRegex = /[Pp][Rr][Ee][Ff][Ii][Xx] ([^:]*):[ ]*<([^>]*)>/g;
    var m: any = true;
    do {
      m = nsRegex.exec(query);
      if (m) {
        namespaces[m[1]] = m[2];
      }
    } while (m);

    // format uri in triples using namespaces
    let bindings: any[] = data.results.bindings;
    bindings = bindings.map((triple) => {
      const variables = Object.keys(triple);

      for (const variable of variables) {
        const tripleVariable = triple[variable];

        if (tripleVariable.type === "uri") {
          for (const namespace of Object.keys(namespaces)) {
            const newValue = tripleVariable.value.replace(
              namespaces[namespace],
              namespace + ":"
            );

            if (newValue !== tripleVariable.value) {
              tripleVariable.value = newValue;
              break;
            }
          }
        }

        triple[variable] = tripleVariable;
      }
      return triple;
    });

    data.results.bindings = bindings;
    return data;
  }

  dispose() {}
}
