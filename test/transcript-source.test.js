"use strict";
/* The Source list above Profile (0.1.138). Choose file used to ask "Where is the transcript from?" every time, and the
   owner's friend said so after a call on 5 Nov 2026. Now the list says it and keeps it: the real panel and host, with a
   temporary home. Where each source opens is in transcript-dialog.test.js. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { bootHost, openPage } = require("./host-panel");

async function until(fn, ms = 8000) {
  const t = Date.now();
  while (!fn()) {
    if (Date.now() - t > ms) throw new Error("timed out");
    await new Promise((r) => setTimeout(r, 20));
  }
}

// a home with all three folders; fn gets it, and HOME is put back after
async function inHome(fn) {
  const h = fs.mkdtempSync(path.join(os.tmpdir(), "sl-source-"));
  for (const d of [".claude/projects", ".codex/sessions", ".cursor/projects"]) fs.mkdirSync(path.join(h, d), { recursive: true });
  const env = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE };
  process.env.HOME = h;
  process.env.USERPROFILE = h;
  try {
    await fn(h);
  } finally {
    for (const k of Object.keys(env))
      if (env[k] === undefined) delete process.env[k];
      else process.env[k] = env[k];
  }
}

const host = (settings, vscode) =>
  bootHost({ vscode, globalState: { storageVersion: 2, settings: { profile: "qa-ts", lint: false, modelPool: [], defaultModelId: null, ...settings } } });

async function panel(h) {
  const p = await openPage(h);
  await p.ready();
  return p;
}

// Choose file: → the folder the file dialog opened at; nothing is asked first
async function chooseFile(p, h) {
  const before = h.calls.openDialog.length;
  p.document.querySelector("#file").dispatchEvent(new p.window.MouseEvent("click", { bubbles: true }));
  await until(() => h.calls.openDialog.length > before);
  assert.equal(p.document.querySelector(".sl-modal-overlay"), null, "no question before the dialog");
  return h.calls.openDialog[before].defaultUri.fsPath;
}

const options = (p) => [...p.document.querySelectorAll("#source option")].map((o) => [o.value, o.textContent]);

test("the list has the four sources, above Profile", async () => {
  await inHome(async () => {
    const h = host();
    const p = await panel(h);
    assert.deepEqual(options(p), [
      ["claude", "Claude Code"],
      ["codex", "Codex"],
      ["cursor", "Cursor Agent"],
      ["other", "Somewhere else"],
    ]);
    const lists = [...p.document.querySelectorAll("#drop select")].map((s) => s.id);
    assert.deepEqual(lists, ["source", "profile"]);
    assert.deepEqual(p.errors, []);
    p.close();
  });
});

test("a new install: Claude Code in VS Code, Cursor Agent in Cursor, and Choose file goes straight to that folder", async () => {
  await inHome(async (home) => {
    let h = host();
    let p = await panel(h);
    assert.equal(p.document.querySelector("#source").value, "claude");
    assert.equal(await chooseFile(p, h), path.join(home, ".claude", "projects"));
    p.close();
    h = host({}, { appName: "Cursor" });
    p = await panel(h);
    assert.equal(p.document.querySelector("#source").value, "cursor");
    assert.equal(await chooseFile(p, h), path.join(home, ".cursor", "projects"));
    assert.deepEqual(p.errors, []);
    p.close();
  });
});

test("a choice decides the folder at once and is still there in a new panel", async () => {
  await inHome(async (home) => {
    const h = host();
    let p = await panel(h);
    const sel = p.document.querySelector("#source");
    sel.value = "codex";
    sel.dispatchEvent(new p.window.Event("change", { bubbles: true }));
    await p.idle();
    assert.equal(await chooseFile(p, h), path.join(home, ".codex", "sessions"));
    p.close();
    p = await panel(h);
    assert.equal(p.document.querySelector("#source").value, "codex");
    p.close();
  });
});

test("Somewhere else opens the home folder; the host gets no source", async () => {
  await inHome(async (home) => {
    const h = host({ transcriptSource: "other" });
    const p = await panel(h);
    assert.equal(p.document.querySelector("#source").value, "other");
    assert.equal(await chooseFile(p, h), home);
    p.close();
  });
});

test("a stored value the list does not have falls back to the default, in the list and for Choose file", async () => {
  await inHome(async (home) => {
    const h = host({ transcriptSource: "gemini" });
    const p = await panel(h);
    assert.equal(p.document.querySelector("#source").value, "claude");
    assert.equal(await chooseFile(p, h), path.join(home, ".claude", "projects"));
    p.close();
  });
});

test("a dialog cancelled: nothing is imported, and the list keeps its value", async () => {
  await inHome(async () => {
    const h = host({ transcriptSource: "cursor" });
    const p = await panel(h);
    await chooseFile(p, h); // the fake answers like a person pressing Cancel
    await p.idle();
    assert.equal(p.document.querySelector("#name-row").hidden, true);
    assert.equal(p.document.querySelector("#source").value, "cursor");
    assert.deepEqual(p.errors, []);
    p.close();
  });
});
