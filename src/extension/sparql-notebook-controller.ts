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
      let message = "error";
      if (error.hasOwnProperty("message")) {
        message = error.message;
        if (error.hasOwnProperty("response") && error.response.hasOwnProperty("data")) {
          message += "\n" + error.response.data;
        }
      }
      execution.replaceOutput([
        this._writeError(message)
      ]);
      return "error";
    });

    // return on error
    if (queryResult === "error") {
      execution.end(false, Date.now());
      return;
    }

    // content type
    const contentType = queryResult.headers["content-type"].split(";")[0];
    const data = queryResult.data;
    let isSuccess = true;

    if (contentType === "application/sparql-results+json") {
      if (data.hasOwnProperty("boolean")) {
        // sparql ask
        execution.replaceOutput([this._writeSparqlJsonResult(data)]);
      }
      else {
        // sparql select
        let dataWithPrefixes = null;
        if (this._getConfiguration("useNamespaces")) {
          const prefixes = this._parsePrefixes(query);
          dataWithPrefixes = this._applyPrefixes(data, prefixes);
        }
        execution.replaceOutput([this._writeSparqlJsonResult(data, dataWithPrefixes)]);
      }
    } else if (contentType === "text/turtle") {
      // sparql construct
      execution.replaceOutput([this._writeTurtleResult(data)]);
    } else if (contentType === "application/json") {
      // stardog is returning and error as json
      execution.replaceOutput([this._writeError(data.message)]);
      isSuccess = false;
    } else {
      console.log("unknown content type", contentType);
      console.log("data", data);
      isSuccess = false;
    }
    execution.end(isSuccess, Date.now());
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

  private _writeSparqlJsonResult(resultJson: any, resultJsonForTable: any = null): vscode.NotebookCellOutput {
    console.log({ resultJson, resultJsonForTable });
    resultJsonForTable = resultJsonForTable ?? resultJson;
    resultJsonForTable = this._addTableSettings(resultJsonForTable);

    console.log({ resultJson, resultJsonForTable });
    return new vscode.NotebookCellOutput([
      this._writeJson(JSON.stringify(resultJson, null, "   ")),
      vscode.NotebookCellOutputItem.json(
        resultJsonForTable,
        "application/sparql-results+json"
      ),
    ]);
  }

  private _writeJson(jsonResult: any): vscode.NotebookCellOutputItem {
    return vscode.NotebookCellOutputItem.text(jsonResult, "text/x-json");
  }

  private _writeError(message: any): vscode.NotebookCellOutput {
    return new vscode.NotebookCellOutput([
      vscode.NotebookCellOutputItem.error({
        name: "SPARQL error",
        message: message,
      }),
    ]);
  }

  private _addTableSettings(data: any) {
    data._settings = {
      tableStyleV2: this._getConfiguration("tableStyleV2")
    };
    return data;
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

  private _parsePrefixes(query: string) {
    let prefixes: any = {};
    let nsRegex = /[Pp][Rr][Ee][Ff][Ii][Xx] ([^:]*):[ ]*<([^>]*)>/g;
    var m: any = true;
    do {
      m = nsRegex.exec(query);
      if (m) {
        prefixes[m[1]] = m[2];
      }
    } while (m);
    return prefixes;
  }

  private _applyPrefixes(dataIn: any, prefixes: any): any {
    // create copy of data, so we dont modify the json 
    let data = JSON.parse(JSON.stringify(dataIn));
    let bindings: any[] = data.results.bindings;
    bindings = bindings.map((triple) => {
      const variables = Object.keys(triple);

      for (const variable of variables) {
        const tripleVariable = triple[variable];

        if (tripleVariable.type === "uri") {
          for (const prefix of Object.keys(prefixes)) {
            const newValue = tripleVariable.value.replace(
              prefixes[prefix],
              prefix + ":"
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

  private _getConfiguration(key: string): any {
    const configuration = vscode.workspace.getConfiguration("sparqlbook");
    return configuration.get(key);
  }

  dispose() { }
}
