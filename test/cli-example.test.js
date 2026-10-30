"use strict";
/* cli/examples/cursor-agent.yml, the GitHub Actions example people copy (phase 11, step 6): the key only where the
   agent runs, the review and the log kept even when the agent fails, and SessionLens commands that the CLI of this
   checkout accepts, so the example does not go stale as options change: each `sessionlens-cli … analyze` line runs
   here on a small session. Read as text: no YAML parser among the dependencies. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { root } = require("./helpers");

const { run } = require(path.join(root, "cli", "lib", "cli.js"));

const text = fs.readFileSync(path.join(root, "cli", "examples", "cursor-agent.yml"), "utf8");
// the steps, each from its "- " line to the next one
const steps = text.split(/\n(?= {6}- )/).slice(1);
const step = (name) => steps.find((s) => s.includes(`name: ${name}\n`)) || "";
const J = JSON.stringify;

test("the example: run by hand, the key only in the agent's step, the review and the log kept even on failure", () => {
  assert.match(text, /\non:\n {2}workflow_dispatch:\n/);
  assert.match(text, /\npermissions:\n {2}contents: read\n/);
  const agent = step("The agent writes the tests");
  assert.match(agent, /CURSOR_API_KEY: \$\{\{ secrets\.CURSOR_API_KEY \}\}/);
  assert.match(agent, /PROMPT: \$\{\{ inputs\.prompt \}\}/);
  assert.match(agent, /run: agent -p "\$PROMPT" --force --output-format stream-json > "\$RUNNER_TEMP\/agent\.jsonl"/);
  assert.equal(text.match(/secrets\./g).length, 1, "the key in one step only");
  assert.match(step("SessionLens reviews the session"), /\n {8}if: always\(\)\n/);
  assert.match(step("Keep the log and the review"), /\n {8}if: always\(\)\n/);
});

test("every SessionLens command of the example is one the CLI accepts", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sl-example-"));
  try {
    const log = [
      J({ type: "user", message: { role: "user", content: "Write a test" } }),
      J({ type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "Done." }] } }),
    ].join("\n");
    fs.writeFileSync(path.join(dir, "agent.jsonl"), log);
    const lines = text.split("\n").filter((l) => /^\s+npx -y sessionlens-cli@/.test(l));
    assert.equal(lines.length, 2);
    for (const line of lines) {
      // npx -y sessionlens-cli@0.1 <args> > or >> <file>
      const args = line
        .replace(/^.*?sessionlens-cli@\S+\s+/, "")
        .replace(/\s*>>?\s*\S+$/, "")
        .replace(/"\$RUNNER_TEMP\/agent\.jsonl"/, "agent.jsonl")
        .split(/\s+/);
      let out = "",
        err = "";
      const code = await run(args, { stdout: { write: (t) => (out += t) }, stderr: { write: (t) => (err += t) }, env: {}, isTTY: false, cwd: dir });
      assert.equal(code, 0, `${line}\n${err}`);
      assert.ok(out.length > 0, line);
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
