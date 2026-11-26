"use strict";
/* The person's messages in the semantic review's prompt (0.1.140): each in full, after the agent's message it answers
   (the task, the plan with its questions, the approval). The compressed transcript keeps 400 characters of a message:
   in the owner's session the model saw 400 of the 9,000 characters of the approved plan, and 2 of its 8 findings went
   against that plan's decisions. Made-up content only. */
const test = require("node:test");
const assert = require("node:assert/strict");
const { load, M } = require("./helpers");

load();
const LensAI = require(M("ai.js"));

const steps = (list) => list.map((e, i) => Object.assign({ seq: i }, e));
const prompt = (events, opts) => LensAI.buildPrompt({ events, spec: "", findings: [] }, opts || {}).user;
const section = (events, opts) =>
  prompt(events, opts).split("# The person's messages, each after the agent's message it answers (full text)\n")[1].split("\n\n# Formal findings")[0];

const PLAN =
  "## PLAN\n" +
  "| file | change |\n|---|---|\n| helpers/log.ts | a line that names a command and does not parse fails the check |\n\n" +
  "Q-1. Tag the wrong-password test @AUTH-02 as well? a) yes, partly automated; b) no. I suggest a).\n" +
  "Q-2. Keep error-context.md? a) turn it off; b) keep it and say so in the README. I suggest b).\n" +
  "x".repeat(2000) +
  "\nWaiting for approval of the plan.";

test("each message of the person in full, after the agent's message it answers; the transcript still cuts them", () => {
  const ev = steps([
    { kind: "user", text: "Review the log helper. Rule: a line that names a command either parses or fails the check." },
    { kind: "read", file: "helpers/log.ts" },
    { kind: "message", text: PLAN },
    { kind: "tool", tool: "TodoWrite" },
    { kind: "user", text: "agree with your suggestions, go" },
    { kind: "edit", file: "helpers/log.ts" },
    { kind: "user", text: "and the README?" },
  ]);
  assert.equal(
    section(ev),
    [
      "--- 0 USER ---\nReview the log helper. Rule: a line that names a command either parses or fails the check.",
      `--- 2 AGENT, the message the person answers ---\n${PLAN}\n--- 4 USER ---\nagree with your suggestions, go`,
      // the last message before it is the person's own: no agent's message to show
      "--- 6 USER ---\nand the README?",
    ].join("\n\n"),
  );
  const transcript = prompt(ev).split("# Transcript (compressed)\n")[1];
  assert.ok(!transcript.includes("Waiting for approval"), "the transcript keeps 400 characters of the plan, as before");
});

test("too long for the room: the first request and the last ones that fit, a line for the rest; a long message is cut", () => {
  const ev = [{ seq: 0, kind: "user", text: "The task: " + "t".repeat(300) }];
  for (let i = 1; i <= 20; i++)
    ev.push({ seq: 2 * i - 1, kind: "message", text: `Report ${i}: ` + "r".repeat(400) }, { seq: 2 * i, kind: "user", text: `Answer ${i}` });
  const out = section(ev, { maxRequests: 3000 });
  assert.ok(out.length <= 3000, String(out.length));
  const heads = out.match(/^--- \d+ \w+.*---$|^\[… .*\]$/gm);
  assert.equal(heads[0], "--- 0 USER ---", "the task");
  assert.match(heads[1], /^\[… \d+ more of the person's messages left out\]$/);
  assert.equal(heads[heads.length - 1], "--- 40 USER ---", "the last answer");
  assert.ok(out.includes("Answer 20") && !out.includes("Answer 1\n"));
  const long = section(
    steps([
      { kind: "message", text: "m".repeat(20000) },
      { kind: "user", text: "ok" },
    ]),
    { maxRequests: 100000 },
  );
  assert.ok(long.includes("m".repeat(16000) + "\n[message cut]") && !long.includes("m".repeat(16001)), "at most 16,000 characters each");
});

test("a local model gets a smaller part; a secret in a message is masked; a session with no message says so", () => {
  const ev = steps([{ kind: "user", text: "Use the key sk-live0123456789abcdefghij and " + "w".repeat(5000) }]);
  assert.ok(section(ev, { local: true }).length <= 3000 + "\n[message cut]".length);
  assert.ok(!prompt(ev).includes("sk-live0123456789abcdefghij") && prompt(ev).includes("[REDACTED]"));
  assert.equal(section(steps([{ kind: "write", file: "a.spec.ts" }])), "(none)");
});

test("the review and the verifier are told that a choice the person made or approved is a decision, not a defect", () => {
  assert.match(LensAI.SYSTEM, /the person's messages in full, each with the agent's message it answers/);
  assert.match(LensAI.SYSTEM, /is a decision, not a defect: do not report\s+it/);
  assert.match(LensAI.VERIFY_SYSTEM, /A finding against a choice the\s+person made or approved in their messages .* is not proven/s);
});
