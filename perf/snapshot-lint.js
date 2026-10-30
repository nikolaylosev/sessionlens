"use strict";
/* Phase 5: LensLint.run() of a checkout's media/lint.js, with the REAL engines (the three ESLint bundles, the three
   tree-sitter engines and Ruff, loaded and booted in Node by the CLI's loader from this checkout's files), over one
   small session per language. Prints { profile: { ran, note, findings } } as JSON.
   node perf/snapshot-lint.js <root> > test/__snapshots__/lint-v0101.json   (root: a 0.1.101 checkout)
   The test compares the current lint.js with that file: once an engine is loaded, lazy loading must not change what
   run() reports. For the current checkout, SL_UPDATE_SNAPSHOTS=1 npm test writes the same file (test/lazy-engines.test.js). */
const path = require("path");
const { loadEngine } = require("../cli/lib/engines");

const MEDIA = path.join(__dirname, "..", "media"); // the engines: vendor files, identical in both checkouts

const CODE = {
  "qa-ts": [
    "e2e/cart.spec.ts",
    `import { test, expect } from '@playwright/test';
test('cart', async ({ page }) => {
  await page.goto('/cart');
  await page.waitForTimeout(2000);
  if (await page.locator('.promo').isVisible()) { await page.click('.promo'); }
  await page.locator('div > span').nth(2).click();
  expect(await page.title()).toBeTruthy();
});
test.skip('later', async () => {});
`,
  ],
  "qa-cypress": [
    "cypress/e2e/login.cy.ts",
    `describe('login', () => {
  it('logs in', () => {
    cy.visit('/login');
    cy.wait(3000);
    cy.get('.btn').click({ force: true });
    cy.get('#form').get('input').type('x');
  });
});
`,
  ],
  "qa-detox": [
    "e2e/app.test.js",
    `describe('app', () => {
  it('opens', async () => {
    await element(by.id('go')).tap();
    await new Promise(r => setTimeout(r, 2000));
    await element(by.text('x')).atIndex(1).tap();
  });
});
`,
  ],
  "qa-java": [
    "src/test/java/CartTest.java",
    `class CartTest {
  @Test
  void add() {
    try { cart.add(1); } catch (Exception e) {}
    assertEquals(cart.size(), 1);
  }
  void remove() { cart.remove(1); }
}
`,
  ],
  "qa-c#": [
    "tests/CartTests.cs",
    `public class CartTests {
  [Test]
  public void Add() {
    try { cart.Add(1); } catch (Exception) { }
    Assert.AreEqual(cart.Count, 1);
  }
  public void Remove() { cart.Remove(1); }
}
`,
  ],
  "qa-python": [
    "tests/test_cart.py",
    `def test_add(cart):
    try:
        cart.add(1)
    except Exception:
        pass
    assert 1 == cart.size()

def test_click(page):
    page.click("#buy")
`,
  ],
  "qa-robot": [
    "tests/cart.robot",
    `*** Test Cases ***
Empty Case

Add Item
    Click Button    buy
    Sleep    2s
`,
  ],
};

function transcript(file, content) {
  const L = [];
  L.push(JSON.stringify({ type: "user", message: { role: "user", content: "Write tests" } }));
  L.push(
    JSON.stringify({
      type: "assistant",
      message: { role: "assistant", content: [{ type: "tool_use", id: "t1", name: "Write", input: { file_path: file, content } }] },
    }),
  );
  L.push(JSON.stringify({ type: "user", message: { role: "user", content: [{ type: "tool_result", tool_use_id: "t1", content: "ok" }] } }));
  return L.join("\n");
}

let engines = null;
// every engine, through the CLI's loader (cli/lib/engines.js), so the tests that use this exercise it too
async function loadEngines() {
  if (engines) return engines;
  for (const language of ["typescript", "cypress", "detox", "java", "csharp", "python", "robot"]) {
    const r = await loadEngine(language, { dir: MEDIA });
    if (r.state !== "ready") throw new Error(`the ${language} engine did not load: ${r.error}`);
  }
  engines = true;
  return engines;
}

function fresh(root, file) {
  const p = path.join(root, "media", file);
  delete require.cache[require.resolve(p)];
  return require(p);
}

async function lintSnapshot(root) {
  await loadEngines();
  const I18N = fresh(root, "i18n.js");
  I18N.set("en");
  const Lens = fresh(root, "lens.js");
  const LensLint = fresh(root, "lint.js");
  const out = {};
  for (const [profile, [file, content]] of Object.entries(CODE)) {
    const cfg = Lens.profile(profile);
    const res = Lens.importAny(transcript(file, content), cfg);
    const events = Array.isArray(res) && res.length && res[0].events ? res[0].events : res;
    const r = LensLint.run({ events }, cfg, {});
    out[profile] = {
      ran: r.ran,
      note: r.note,
      findings: r.findings.map((f) => ({ check: f.check, severity: f.severity, rule: f.rule, line: f.line, message: f.message })),
    };
  }
  return out;
}

if (require.main === module)
  lintSnapshot(path.resolve(process.argv[2] || path.join(__dirname, ".."))).then((o) => {
    process.stdout.write(JSON.stringify(o, null, 1) + "\n");
    process.exit(0);
  });
module.exports = { lintSnapshot, loadEngines, CODE, transcript };
