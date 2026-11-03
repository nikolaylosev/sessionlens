"use strict";
/* sessionlens analyze --review (cli/lib/model.js): the panel's own review (LensAI.review) over the extension's transport,
   against a fake server or a fake fetch. What must hold: its findings never change the verdict or --fail-on, a model
   that fails or has no key leaves the report and the exit code as they were, the key stays out of every output, nothing
   is sent without --review, and what a model says cannot put a link or an escape code into a report. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const { load, root } = require("./helpers");

load();
const { run } = require(path.join(root, "cli", "lib", "cli.js"));
const model = require(path.join(root, "cli", "lib", "model.js"));

const J = JSON.stringify;
const SECRET = "sk-ant-abcdefghijklmnopqrstuvwxyz012345";
const CODE = `import { test, expect } from '@playwright/test';
test('R1: adds a todo', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('What needs to be done?').fill('milk');
  await expect(page.getByText('milk')).toHaveText('milk');
});
`;
const QUOTE = "await page.goto('/');";
const tool = (id, name, input, result) => [
  J({ type: "assistant", message: { role: "assistant", content: [{ type: "tool_use", id, name, input }] } }),
  J({ type: "user", message: { role: "user", content: [{ type: "tool_result", tool_use_id: id, content: result }] } }),
];
const LOG = [
  J({ type: "user", message: { role: "user", content: "Write a test for adding a todo" } }),
  ...tool("t1", "Write", { file_path: "tests/todo.spec.ts", content: CODE }, "ok"),
  ...tool("t2", "Bash", { command: "npx playwright test" }, "  ✓  1 [chromium] › tests/todo.spec.ts:2:5 › R1: adds a todo (500ms)\n\n  1 passed (1.2s)\n"),
  J({ type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "The test passes." }] } }),
].join("\n");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sl-review-"));
test.after(() => fs.rmSync(dir, { recursive: true, force: true }));
fs.writeFileSync(path.join(dir, "a.jsonl"), LOG);
// the same session with a token in its test: red by hardcoded_secret, and the token must not reach the model
const WITH_SECRET = LOG.replace(J(CODE).slice(1, -1), J(CODE.replace("test('R1", `const token = "${SECRET}";\ntest('R1`)).slice(1, -1));
fs.writeFileSync(path.join(dir, "secret.jsonl"), WITH_SECRET);
fs.mkdirSync(path.join(dir, "folder"));
fs.writeFileSync(path.join(dir, "folder", "a.jsonl"), LOG);
const BASE = ["analyze", "a.jsonl", "--profile", "qa-ts"];

async function cli(args, io = {}) {
  let out = "",
    err = "";
  const code = await run(args, {
    stdout: { write: (t) => (out += t) },
    stderr: { write: (t) => (err += t) },
    env: io.env || {},
    isTTY: false,
    cwd: dir,
    minGapMs: 0,
    fetchImpl: io.fetchImpl,
  });
  return { code, out, err };
}

const finding = (check, severity, message, evidence = QUOTE) => ({ check, severity, message, evidence });
// the server's replies: what the review says, then which of them the verification keeps
const answer =
  (found, kept = found.map((_, i) => ({ i, keep: true, evidence: QUOTE }))) =>
  (body) =>
    J({ choices: [{ message: { content: J(/^# Findings/.test(body.messages[1].content) ? kept : found) } }] });

/* A fake OpenAI-compatible server on a real port, so the requests go through providers.js's own nodeFetch. */
async function withServer(reply, fn) {
  const seen = [];
  const server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      const body = JSON.parse(raw);
      seen.push({ url: req.url, auth: req.headers.authorization, body });
      const r = reply(body);
      res.writeHead(typeof r === "number" ? r : 200, { "content-type": "application/json" });
      res.end(typeof r === "number" ? J({ error: { message: "the server said no" } }) : r);
    });
  });
  await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
  try {
    return await fn(`http://127.0.0.1:${server.address().port}/v1`, seen);
  } finally {
    await new Promise((ok) => server.close(ok));
  }
}
const QWEN = (url) => ["--review", "--provider", "qwen", "--base-url", url];
const KEY = { env: { DASHSCOPE_API_KEY: "qwen-key-1234567890" } };

test("what the --review options cannot be: exit 2 with the reason, and nothing is sent", async () => {
  const errors = {
    "--review needs --provider": [...BASE, "--review"],
    'unknown provider "acme"': [...BASE, "--review", "--provider", "acme"],
    "does not do yet": [...BASE, "--review", "--provider", "claudecli"],
    "--provider goes with --review": [...BASE, "--provider", "anthropic"],
    "--model goes with --review": [...BASE, "--model", "x"],
    "--base-url goes with --review": [...BASE, "--base-url", "http://x"],
    "--base-url is for the providers local and qwen": [...BASE, "--review", "--provider", "anthropic", "--base-url", "http://x"],
    "--base-url is not an http or https address": [...BASE, "--review", "--provider", "local", "--base-url", "file:///etc/passwd"],
    "--review is for one session": ["analyze", "folder", "--profile", "qa-ts", "--review", "--provider", "local"],
  };
  for (const [reason, args] of Object.entries(errors)) {
    const r = await cli(args, {
      fetchImpl: () => {
        throw new Error("nothing may be sent");
      },
    });
    assert.equal(r.code, 2, reason);
    assert.ok(r.err.includes(reason), `${reason}: ${r.err}`);
    assert.equal(r.out, "");
  }
});

test("--help names every provider the CLI can use, with its key", async () => {
  const { out } = await cli(["--help"]);
  for (const name of model.PROVIDERS) assert.match(out, new RegExp(`\\b${name}\\b`), name);
  for (const env of Object.values(model.KEY_ENV)) assert.ok(out.includes(env), env);
  assert.ok(!model.PROVIDERS.some((name) => /cli$/.test(name)), "no subscription provider yet");
});

test("a model's high finding does not change the verdict or --fail-on: a green session stays green, exit 0", async () => {
  await withServer(answer([finding("ai_purpose", "high", "The test only checks the text it typed")]), async (url, seen) => {
    const args = [...BASE, "--ci", "--fail-on", "red", "--json", ...QWEN(url)];
    const r = await cli(args, KEY);
    assert.equal(r.code, 0, r.err);
    const j = JSON.parse(r.out);
    assert.equal(j.verdict, "green");
    assert.deepEqual(j.findings, []);
    assert.deepEqual(
      j.modelReview.findings.map((f) => [f.check, f.severity, f.verified]),
      [["ai_purpose", "high", true]],
    );
    assert.match(j.modelReview.findings[0].message, /only checks the text/);
    assert.equal(seen.length, 2, "the review and its verification");
    assert.equal(seen[0].auth, "Bearer qwen-key-1234567890");
    // everything else is what a run without --review gives
    const plain = JSON.parse((await cli(["analyze", "a.jsonl", "--profile", "qa-ts", "--ci", "--json"])).out);
    for (const x of [j, plain]) {
      delete x.created;
      delete x.modelReview;
    }
    assert.deepEqual(j, plain);
  });
});

test("the text and the Markdown show the review apart, and say it is not counted; the verification's drops are counted", async () => {
  const found = [
    finding("ai_purpose", "high", "The test only checks the text it typed"),
    finding("ai_missing", "low", "No test for an empty todo title", "getByPlaceholder('What needs to be done?')"),
  ];
  const kept = [
    { i: 0, keep: true, evidence: QUOTE },
    { i: 1, keep: false, why: "not in the material" },
  ];
  await withServer(answer(found, kept), async (url) => {
    const text = await cli([...BASE, "--ci", ...QWEN(url)], KEY);
    assert.match(text.out, /^Verdict: Green/m);
    assert.match(text.out, /Model review by qwen\/\S+, not counted in the verdict: 1 high, 0 medium, 0 low; 1 dropped by verification/);
    assert.match(text.out, /^high\s+ai_purpose\s+The test only checks/m);
    assert.doesNotMatch(text.out, /No test for an empty todo title/);
    const md = await cli([...BASE, "--ci", "--md", ...QWEN(url)], KEY);
    assert.match(md.out, /### Model review: 1 high, 0 medium, 0 low; 1 dropped by verification/);
    assert.match(md.out, /Not counted in the verdict\. By qwen/);
    assert.match(md.out, /`ai_purpose`/);
  });
});

test("the log's text goes to the model with secrets masked, and stderr says what goes where", async () => {
  await withServer(answer([]), async (url, seen) => {
    const r = await cli(["analyze", "secret.jsonl", "--profile", "qa-ts", ...QWEN(url)], KEY);
    assert.match(r.out, /hardcoded_secret/);
    assert.ok(seen[0].body.messages[1].content.includes(QUOTE), "the code is sent");
    assert.ok(!J(seen).includes(SECRET), "the secret is not");
    assert.match(r.err, /--review: the specification, the test code and a shortened transcript go to Qwen \(Alibaba Cloud\) at http:\/\/127/);
    assert.match(r.out, /Model review by .*: 0 high, 0 medium, 0 low/);
  });
});

test("--ci sets ai_questions aside as context: nobody could be asked; without --ci it is a finding like the others", async () => {
  const found = [finding("ai_questions", "high", "The agent should have asked which page to test")];
  await withServer(answer(found), async (url) => {
    const ci = JSON.parse((await cli([...BASE, "--ci", "--json", ...QWEN(url)], KEY)).out).modelReview;
    assert.deepEqual(ci.findings, []);
    assert.deepEqual(
      ci.context.map((f) => f.check),
      ["ai_questions"],
    );
    const out = (await cli([...BASE, "--ci", ...QWEN(url)], KEY)).out;
    assert.match(out, /not counted in the verdict: 0 high/);
    assert.match(out, /Context, not counted in CI: .*ai_questions/);
    const off = JSON.parse((await cli([...BASE, "--json", ...QWEN(url)], KEY)).out).modelReview;
    assert.deepEqual(off.context, []);
    assert.equal(off.findings.length, 1);
  });
});

test("a model that fails: the report and the exit code stand, the reason is on stderr, in the report and in the JSON", async () => {
  await withServer(
    () => 500,
    async (url) => {
      const red = await cli([...BASE, "--fail-on", "red", ...QWEN(url)], KEY);
      assert.equal(red.code, 1, "--fail-on still decides by the session's own findings");
      assert.match(red.out, /^Verdict: Red/m);
      assert.match(red.err, /the model review did not run: HTTP 500: the server said no/);
      assert.match(red.out, /Model review by qwen\/\S+ did not run: HTTP 500/);
      const j = JSON.parse((await cli([...BASE, "--ci", "--json", ...QWEN(url)], KEY)).out);
      assert.equal(j.verdict, "green");
      assert.match(j.modelReview.error, /HTTP 500/);
      const md = await cli([...BASE, "--ci", "--md", ...QWEN(url)], KEY);
      assert.equal(md.code, 0);
      assert.match(md.out, /### Model review\n.*did not run: HTTP 500/);
    },
  );
});

test("a server that cannot be reached is a failed review too, not a failed run", async () => {
  const r = await cli([...BASE, "--ci", ...QWEN("http://127.0.0.1:9/v1")], KEY);
  assert.equal(r.code, 0);
  assert.match(r.err, /the model review did not run: Failed to fetch/);
});

test("no key: nothing is sent, the report stands, and the message names the variable (a fork's pull request has no secrets)", async () => {
  const fetchImpl = () => {
    throw new Error("nothing may be sent");
  };
  const r = await cli([...BASE, "--ci", "--fail-on", "red", "--review", "--provider", "anthropic"], { fetchImpl });
  assert.equal(r.code, 0);
  assert.match(r.err, /the model review did not run: ANTHROPIC_API_KEY is not set/);
  assert.match(r.out, /Model review by anthropic\/\S+ did not run: ANTHROPIC_API_KEY is not set/);
  const other = await cli([...BASE, "--review", "--provider", "openai"], { env: { ANTHROPIC_API_KEY: "the-wrong-provider-key" }, fetchImpl });
  assert.match(other.err, /OPENAI_API_KEY is not set/);
});

test("the provider's own request: its address and its key; a key the provider echoes is masked in every output", async () => {
  const key = "sk-ant-the-real-key-000111222333";
  const calls = [];
  const fetchImpl = async (url, opts) => {
    calls.push({ url, key: opts.headers["x-api-key"] });
    return { ok: false, status: 401, json: async () => ({ error: { message: `invalid key ${key}` } }) };
  };
  const args = [...BASE, "--review", "--provider", "anthropic", "--model", "claude-test"];
  const r = await cli(args, { env: { ANTHROPIC_API_KEY: key }, fetchImpl });
  assert.deepEqual(calls[0], { url: "https://api.anthropic.com/v1/messages", key });
  assert.ok(!(r.out + r.err).includes(key), "the key is in no output");
  assert.match(r.err, /HTTP 401: invalid key \*\*\*/);
  const j = JSON.parse((await cli([...args, "--json"], { env: { ANTHROPIC_API_KEY: key }, fetchImpl })).out);
  assert.equal(j.modelReview.model, "anthropic/claude-test");
  assert.ok(!J(j).includes(key));
});

test("a verification that fails keeps the findings, unverified, and says so", async () => {
  let n = 0;
  await withServer(
    (body) => (++n === 1 ? answer([finding("ai_purpose", "medium", "The test only checks the text it typed")])(body) : 500),
    async (url) => {
      const r = await cli([...BASE, "--json", ...QWEN(url)], KEY);
      const m = JSON.parse(r.out).modelReview;
      assert.equal(m.findings[0].verified, false);
      assert.match(m.verifyError, /verification not performed/);
      assert.match(r.err, /the model review: verification not performed/);
    },
  );
});

test("a local server: a file that fails is a partial review, and all of them failing is no review, not a clean one", async () => {
  const twoFiles = [
    J({ type: "user", message: { role: "user", content: "Write two tests" } }),
    ...tool("t1", "Write", { file_path: "tests/a.spec.ts", content: CODE }, "ok"),
    ...tool("t2", "Write", { file_path: "tests/b.spec.ts", content: CODE }, "ok"),
  ].join("\n");
  fs.writeFileSync(path.join(dir, "two.jsonl"), twoFiles);
  const TWO = ["analyze", "two.jsonl", "--profile", "qa-ts", "--json", "--review", "--provider", "local", "--base-url"];
  await withServer(
    () => 500,
    async (url) => {
      const r = await cli([...TWO, url]);
      assert.match(JSON.parse(r.out).modelReview.error, /HTTP 500/);
      assert.match(r.err, /did not run: HTTP 500/);
    },
  );
  let n = 0;
  await withServer(
    (body) => (/^# Findings/.test(body.messages[1].content) ? answer([])(body) : ++n === 1 ? 500 : answer([])(body)),
    async (url) => {
      const r = await cli([...TWO, url]);
      const m = JSON.parse(r.out).modelReview;
      assert.match(m.partial, /^1 of 2 files not reviewed: HTTP 500/);
      assert.match(r.err, /the model review: 1 of 2 files not reviewed/);
    },
  );
});

test("what a model says cannot put a link, an image or an escape code into a report", async () => {
  const bad = finding("ai_other", "high", "See ![x](https://evil.example/a.png) and [here](https://evil.example)\n# A heading\x1b[31m in red");
  await withServer(answer([bad]), async (url) => {
    const md = (await cli([...BASE, "--md", ...QWEN(url)], KEY)).out;
    assert.ok(!md.includes("![x]("), md);
    assert.ok(!md.includes("[here]("), md);
    assert.ok(md.includes("\\!\\[x\\]"), md);
    assert.doesNotMatch(md, /^# A heading/m);
    const text = (await cli([...BASE, ...QWEN(url)], KEY)).out;
    assert.ok(!text.includes("\x1b"), "no escape code on a terminal");
    const j = JSON.parse((await cli([...BASE, "--json", ...QWEN(url)], KEY)).out);
    assert.ok(!/\p{Cc}/u.test(j.modelReview.findings[0].message));
  });
});

test("--json-file holds the review too; a local server takes no key", async () => {
  await withServer(answer([finding("ai_purpose", "high", "The test only checks the text it typed")]), async (url, seen) => {
    const r = await cli([...BASE, "--json-file", "out/review.json", "--review", "--provider", "local", "--base-url", url]);
    assert.equal(r.code, 0, r.err);
    assert.equal(seen[0].auth, undefined);
    const j = JSON.parse(fs.readFileSync(path.join(dir, "out", "review.json"), "utf8"));
    assert.equal(j.modelReview.findings[0].check, "ai_purpose");
  });
});

test("without --review nothing is sent, whatever keys are set, and the report has no such part", async () => {
  const r = await cli([...BASE, "--json"], {
    env: { ANTHROPIC_API_KEY: "a-key-that-is-set" },
    fetchImpl: () => {
      throw new Error("nothing may be sent");
    },
  });
  assert.equal(r.code, 0);
  assert.equal(JSON.parse(r.out).modelReview, undefined);
  assert.equal(r.err, "");
});
