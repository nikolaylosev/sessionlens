"use strict";
/* "Assertions through page objects" in the session's Assertions panel (0.1.127): each test of the last version of a
   test file that calls a page object's expect…() method, its own assertions, and the assertions of each method in the
   last version of the file that defines it; a method no file of the session defines says so. The answer to "where are
   the assertions at all?" in a Page Object Model session. Lens.poAssertions and the real panel (test/host-panel.js). */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { bootHost, openPage } = require("./host-panel");
const { createStore } = require("../store.js");
const { load } = require("./helpers");

const { Lens } = load();
const cfg = Lens.profile("qa-ts");

const PAGE = `import { expect, type Page } from '@playwright/test';
export class SearchPage {
  constructor(private page: Page) {}
  async open() {
    await this.page.getByRole('button', { name: 'Search' }).click();
  }
  async expectSearchOpen() {
    await expect(this.page.getByRole('textbox')).toBeVisible();
    await expect(this.page.getByText('Start typing')).toBeVisible();
  }
  async expectResults(q: string) {
    await expect(this.page.getByRole('heading')).toHaveText(q);
  }
}
`;
const SPEC = `import { test, expect } from '@playwright/test';
test('search opens', async ({ searchPage }) => {
  await searchPage.open();
  await searchPage.expectSearchOpen();
});
test('search finds owls', async ({ searchPage, page }) => {
  await searchPage.open();
  await searchPage.expectResults('owls');
  await searchPage.expectFilters();
  await expect(page).toHaveURL(/q=owls/);
});
test('search closes', async ({ page }) => {
  await expect(page.getByRole('dialog')).toBeHidden();
});
`;
const EVENTS = [
  { seq: 0, kind: "user", text: "Write the search tests" },
  // an earlier version of the page object: one assertion fewer in expectSearchOpen
  {
    seq: 1,
    kind: "write",
    file: "tests/pages/search.page.ts",
    new_content: PAGE.replace("    await expect(this.page.getByText('Start typing')).toBeVisible();\n", ""),
  },
  { seq: 2, kind: "write", file: "tests/search.spec.ts", new_content: SPEC },
  { seq: 3, kind: "write", file: "tests/pages/search.page.ts", new_content: PAGE },
];

test("poAssertions: the tests that call a page object's expect…() method, their own assertions and each method's", () => {
  assert.deepEqual(Lens.poAssertions(EVENTS, cfg), [
    { file: "tests/search.spec.ts", test: "search opens", own: 0, calls: [{ method: "expectSearchOpen", asserts: 2 }] },
    {
      file: "tests/search.spec.ts",
      test: "search finds owls",
      own: 1,
      calls: [
        { method: "expectResults", asserts: 1 },
        { method: "expectFilters", asserts: null },
      ],
    },
  ]);
  // a fragment of an edit is no version of the file; no page object call, no row
  assert.deepEqual(Lens.poAssertions([{ seq: 0, kind: "edit", file: "tests/search.spec.ts", new_content: SPEC, fragment_only: true }], cfg), []);
  assert.deepEqual(
    Lens.poAssertions(
      [EVENTS[2]].map((e) => Object.assign({}, e, { new_content: SPEC.replace(/searchPage\.expect\w+\(\S*\);/g, "") })),
      cfg,
    ),
    [],
  );
});

async function until(fn, ms = 5000) {
  const t = Date.now();
  while (!fn()) {
    if (Date.now() - t > ms) throw new Error("timed out");
    await new Promise((r) => setTimeout(r, 20));
  }
}

test("the Assertions panel lists them; a method no file of the session defines says so", async () => {
  const s = {
    id: "po1",
    name: "page objects",
    nameSet: true,
    task: "",
    profile: "qa-ts",
    created: "2026-10-12T00:00:00.000Z",
    events: EVENTS,
    findings: [],
    verdicts: {},
    spec: "",
    importGen: Lens.IMPORT_GEN,
  };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sl-po-"));
  const st = createStore({ dir: path.join(dir, "sessions") });
  await st.open();
  await st.put(s, { analyzedGen: "" });
  const host = bootHost({
    storageDir: dir,
    globalState: { storageVersion: 2, settings: { profile: "qa-ts", lint: false, rulesTarget: "claude", modelPool: [], defaultModelId: null } },
  });
  const p = await openPage(host, { sessionId: s.id });
  await p.ready();
  await until(() => p.document.querySelector("#asserts h4"));
  const box = p.document.querySelector("#asserts");
  assert.equal(box.querySelector("h4").textContent, "Assertions through page objects");
  const rows = [...box.querySelectorAll("table")].at(-1).querySelectorAll("tr");
  assert.deepEqual(
    [...rows].slice(1).map((r) => [...r.querySelectorAll("td")].map((td) => td.textContent)),
    [
      ["tests/search.spec.ts: search opens", "0", "expectSearchOpen: 2"],
      ["tests/search.spec.ts: search finds owls", "1", "expectResults: 1, expectFilters: not in this session"],
    ],
  );
  p.close();
});
