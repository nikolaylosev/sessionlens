"use strict";
/* Where the "choose a transcript" dialog opens (open:transcript) for each answer to "Where is the transcript from?":
   the real extension.js under the fake "vscode" module, with a temporary home. Cursor opens ~/.cursor/projects, one
   folder per workspace (0.1.121–0.1.124 went straight into this workspace's agent-transcripts, with no way up). */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { fakeVscode, loadExtension, fakeContext, fakeWebviewView } = require("./fake-vscode");

// the folder the dialog was opened at, for `source`, with these workspace folders, in the home `h`
async function dialogFolder(h, source, folders) {
  const env = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE };
  process.env.HOME = h; // os.homedir() reads these
  process.env.USERPROFILE = h;
  try {
    const { vscode, registered, calls } = fakeVscode({
      workspaceFolders: folders && folders.map((p) => ({ uri: { scheme: "file", fsPath: p } })),
    });
    loadExtension(vscode).activate(fakeContext({ globalState: { settings: {}, sessions: {} } }));
    const wv = fakeWebviewView();
    registered.views.sessionlensView.resolveWebviewView(wv.view);
    assert.equal(await wv.send("open:transcript", source ? { source } : {}), null); // the dialog was cancelled
    assert.equal(calls.openDialog.length, 1);
    return calls.openDialog[0].defaultUri.fsPath;
  } finally {
    for (const k of Object.keys(env))
      if (env[k] === undefined) delete process.env[k];
      else process.env[k] = env[k];
  }
}
const home = () => fs.mkdtempSync(path.join(os.tmpdir(), "sl-dialog-"));
const mk = (...p) => {
  fs.mkdirSync(path.join(...p), { recursive: true });
  return path.join(...p);
};

test("Cursor Agent: ~/.cursor/projects, even when this workspace has an agent-transcripts folder", async () => {
  const h = home();
  const projects = mk(h, ".cursor", "projects");
  mk(projects, "Users-me-shop", "agent-transcripts");
  mk(projects, "Users-me-other", "agent-transcripts");
  assert.equal(await dialogFolder(h, "cursor", ["/Users/me/shop"]), projects);
  assert.equal(await dialogFolder(h, "cursor", ["/Users/me/web", "/Users/me/shop"]), projects);
  assert.equal(await dialogFolder(h, "cursor", undefined), projects); // no workspace open
});

test("Cursor Agent: no Cursor at all → the home folder", async () => {
  const h = home();
  assert.equal(await dialogFolder(h, "cursor", ["/Users/me/shop"]), h);
  mk(h, ".cursor"); // Cursor, but no agent session yet
  assert.equal(await dialogFolder(h, "cursor", ["/Users/me/shop"]), h);
});

test("Claude Code, Codex and somewhere else open where they did before", async () => {
  const h = home();
  assert.equal(await dialogFolder(h, "claude"), h);
  assert.equal(await dialogFolder(h, "codex"), h);
  const claude = mk(h, ".claude", "projects");
  const codex = mk(h, ".codex", "sessions");
  mk(h, ".cursor", "projects");
  assert.equal(await dialogFolder(h, "claude"), claude);
  assert.equal(await dialogFolder(h, "codex"), codex);
  assert.equal(await dialogFolder(h, undefined), h);
});
