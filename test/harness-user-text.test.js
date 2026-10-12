"use strict";
/* What Claude Code or the editor puts into the person's turn is not the person's message (0.1.127): a slash command's
   record and its local output, the browser extension's instructions, the file open in the editor, a reminder, a
   background task's notice, an image's caption, an interruption, and a record marked isMeta (a skill's text, "Continue
   from where you left off."). It is taken out of the text; a text with nothing else is no message. The person's
   paste stays. On the owner's sessions 173 of 679 user messages were such. */
const test = require("node:test");
const assert = require("node:assert/strict");
const { load } = require("./helpers");

const { Lens } = load();
const cfg = Lens.profile("qa-ts");

test("the harness's and the editor's text is taken out; the person's words and paste stay", () => {
  const cases = [
    ["<ide_opened_file>The user opened the file /p/a.ts in the IDE.</ide_opened_file>", ""],
    ["<command-name>/list-agents</command-name>\n  <command-message>list-agents</command-message>\n  <command-args></command-args>", ""],
    ["<local-command-caveat>The command below was run directly in Claude Code…</local-command-caveat>", ""],
    ["<local-command-stdout>No subagents</local-command-stdout>", ""],
    ["<browser_instruction>[Browser disconnected: The browser connection has been closed.]</browser_instruction>", ""],
    ["<browser_instruction># Claude in Chrome browser automation\n\nYou have access to", "", "a closing tag cut off"],
    ["<system-reminder>The date has changed.</system-reminder>", ""],
    ["<task-notification>\n<task-id>b1</task-id>\n</task-notification>", ""],
    ["[Image: source: /tmp/images/1.png, original 2134x458]", ""],
    ["[Image: original 2880x1778, displayed at 2000x1235. Multiply coordinates by 1.44 to map to original image.]", ""],
    ["[Request interrupted by user for tool use]", ""],
    ["[Request interrupted by user]", ""],
    ["<ide_selection>const a = 1;</ide_selection>\nwhy does this fail?", "why does this fail?"],
    [
      '<pasted_content id="7bd2">\nUse the planner agent\n</pasted_content id="7bd2">',
      '<pasted_content id="7bd2">\nUse the planner agent\n</pasted_content id="7bd2">',
    ],
    ["найди агенты в проекте", "найди агенты в проекте"],
    ["the error is on this screen: [Image: source: x]", "the error is on this screen: [Image: source: x]", "a caption after the person's words"],
  ];
  for (const [text, want, why] of cases) assert.equal(Lens.personText(text), want, why || text.slice(0, 40));
});

const line = (o) => JSON.stringify(o);
const user = (content, extra) => line(Object.assign({ type: "user", message: { role: "user", content } }, extra));
const said = (text) => line({ type: "assistant", message: { role: "assistant", content: [{ type: "text", text }] } });

test("the import keeps only the person's messages; a record marked isMeta is none", () => {
  const ev = Lens.importAny(
    [
      user("<command-name>/list-agents</command-name>"),
      user("Write the cart tests"),
      said("Writing them."),
      user([
        { type: "text", text: "<ide_opened_file>The user opened cart.spec.ts</ide_opened_file>" },
        { type: "text", text: "Use the page objects" },
      ]),
      user("Base directory for this skill: /Users/me/.claude/skills/plain-writing\n\n# Plain writing", { isMeta: true }),
      user("Continue from where you left off.", { isMeta: true }),
      user([
        { type: "text", text: "[Image: source: /tmp/1.png, original 800x600]" },
        { type: "image", source: {} },
      ]),
    ].join("\n"),
    cfg,
  );
  assert.deepEqual(
    ev.filter((e) => e.kind === "user").map((e) => e.text),
    ["Write the cart tests", "Use the page objects"],
  );
});

test("two images' captions are no repeated request", () => {
  const frustration = (lines) =>
    Lens.runChecks(Lens.importAny(lines.join("\n"), cfg), cfg)
      .filter((f) => f.check === "user_frustration")
      .map((f) => f.message);
  const caption = "[Image: source: /tmp/claude/images/1.png, original 2134x458]";
  assert.deepEqual(
    frustration([
      user("Fix the layout of the cart page"),
      said("Done."),
      user([{ type: "text", text: caption }]),
      said("Ok."),
      user([{ type: "text", text: caption }]),
      said("Ok."),
    ]),
    [],
  );
  assert.equal(
    frustration([user("Fix the layout of the cart page"), said("Done."), user("Fix the layout of the cart page"), said("Ok.")]).length,
    1,
    "the person's own repeat still counts",
  );
});

test("a session imported before with such a user message asks to be imported again (IMPORT_GEN 9)", () => {
  const s = (text) => ({ profile: "qa-ts", importGen: 8, events: [{ seq: 0, kind: "user", text }] });
  assert.equal(Lens.needsReimport(s("<ide_opened_file>The user opened a.ts</ide_opened_file>")), true);
  assert.equal(Lens.needsReimport(s("Write the tests")), false);
  assert.equal(Lens.needsReimport(Object.assign(s("<ide_opened_file>x</ide_opened_file>"), { importGen: Lens.IMPORT_GEN })), false);
});
