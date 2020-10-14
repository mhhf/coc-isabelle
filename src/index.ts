'use strict';

import * as path from 'path';
import * as fs from 'fs';
import * as library from './library'
import * as protocol from './protocol';
// import * as decorations from './decorations';
import { events, LanguageClient, LanguageClientOptions, ServerOptions } from 'coc.nvim';

const log = str => fs.appendFile("/tmp/coc.log", str + "\n", () => {})


import { commands, CompleteResult, ExtensionContext, listManager, sources, workspace } from 'coc.nvim';
import DemoList from './lists';


let last_caret_update: protocol.Caret_Update = {}

export async function activate(context: ExtensionContext): Promise<void> {

  const isabelle_tool = "/nix/store/fl4hfnj6rmzns7bzgds970jwkjsvsbvp-isabelle-2020/bin/isabelle";

  const standard_args = ["-o", "vscode_unicode_symbols", "-o", "vscode_pide_extensions"]
  const server_options: ServerOptions = { command: isabelle_tool,
        args: ["vscode_server"].concat(standard_args) };
  const language_client_options: LanguageClientOptions = {
    documentSelector: [
      { language: "isabelle", scheme: "file" },
      { language: "isabelle-ml", scheme: "file" },
      { language: "bibtex", scheme: "file" }
    ]
  };

  const language_client =
      new LanguageClient("Isabelle", server_options, language_client_options, false)

  function apply_decoration(decoration: protocol.Decoration) {
    // log(JSON.stringify(decoration))
  }

  language_client.onReady().then(() => {
    workspace.showMessage("rdy");
    language_client.onNotification(protocol.decoration_type, apply_decoration)
  });


  async function update_caret()
  {
    let caret_update: protocol.Caret_Update = {}
    const uri = workspace.uri;
    const cursor = await workspace.getCursorPosition()
    caret_update = { uri: uri, line: cursor.line, character: cursor.character }
    if (last_caret_update !== caret_update) {
      if (caret_update.uri)
        language_client.sendNotification(protocol.caret_update_type, caret_update)
      last_caret_update = caret_update
    }
  }

  const dynamic_output = workspace.createOutputChannel("isoutput")

  language_client.onReady().then(() =>
  {
    // context.subscriptions.push(dynamic_output)
    language_client.onNotification(protocol.dynamic_output_type,
      params => {
        dynamic_output.clear();
        dynamic_output.appendLine(params.content);
      })
    update_caret()
    events.on("CursorMoved", () => { update_caret() });
  })

  /* preview panel */

  context.subscriptions.push(
    commands.registerCommand("isabelle.preview", uri => dynamic_output.show(true)),
    commands.registerCommand("isabelle.preview-split", uri => log(uri)))


  /* state panel */

  context.subscriptions.push(
    commands.registerCommand("isabelle.state", uri => log("state " + uri)))


  context.subscriptions.push(
    commands.registerCommand('coc-test.Command', async () => {
      workspace.showMessage(`coc-test tttCommands works!`);
    }),

    language_client.start(),

    listManager.registerList(new DemoList(workspace.nvim)),

    sources.createSource({
      name: 'coc-test completion source', // unique id
      shortcut: '[CS]', // [CS] is custom source
      priority: 1,
      triggerPatterns: [], // RegExp pattern
      doComplete: async () => {
        const items = await getCompletionItems();
        return items;
      },
    }),

    workspace.registerKeymap(
      ['n'],
      'coc-test-keymap',
      async () => {
        workspace.showMessage(`registerKeymap`);
      },
      { sync: false }
    ),

    workspace.registerAutocmd({
      event: 'InsertLeave',
      request: true,
      callback: () => {
        workspace.showMessage(`registerAutocmd on InsertLeave`);
      },
    })
  );
}

async function getCompletionItems(): Promise<CompleteResult> {
  return {
    items: [
      {
        word: 'TestCompletionItem 1',
      },
      {
        word: 'TestCompletionItem 2',
      },
    ],
  };
}
