"use strict";
/* assert_weakened: between two versions of a test the session saw (two writes, a write and an edit, or the same test
   shown twice in messages), an assertion became weaker or the test lost assertions. High, at the later version. What
   must not count: the first version of a file, a stronger or an equally strong assertion, an added assertion, a
   renamed test, a change in another test. */
const test = require("node:test");
const assert = require("node:assert/strict");
const { load } = require("./helpers");

const { Lens } = load();

// steps: ["write", file, content] | ["edit", file, old, new] | ["say", text] (the agent's message) | ["user", text]
function transcript(steps) {
  const L = [JSON.stringify({ type: "user", message: { role: "user", content: "Write the tests" } })];
  steps.forEach(([kind, a, b, c], i) => {
    const id = "t" + i;
    if (kind === "user") return L.push(JSON.stringify({ type: "user", message: { role: "user", content: a } }));
    if (kind === "say") return L.push(JSON.stringify({ type: "assistant", message: { role: "assistant", content: [{ type: "text", text: a }] } }));
    const [name, input] = kind === "write" ? ["Write", { file_path: a, content: b }] : ["Edit", { file_path: a, old_string: b, new_string: c }];
    L.push(JSON.stringify({ type: "assistant", message: { role: "assistant", content: [{ type: "tool_use", id, name, input }] } }));
    L.push(JSON.stringify({ type: "user", message: { role: "user", content: [{ type: "tool_result", tool_use_id: id, content: "ok" }] } }));
  });
  return L.join("\n");
}
const findings = (profile, steps) => {
  const cfg = Lens.profile(profile);
  return Lens.runChecks(Lens.importAny(transcript(steps), cfg), cfg).filter((f) => f.check === "assert_weakened");
};
const found = (profile, steps) => findings(profile, steps).map((f) => `${f.severity}: ${f.message}`);

const F = "e2e/cart.spec.ts";
const ts = (body) => `test('total', async () => {\n${body}\n});\n`;
const py = (body) => `def test_total():\n${body}\n`;
const java = (body) => `class CartTest {\n  @Test\n  void total() {\n${body}\n  }\n}\n`;

test("TypeScript: a value assertion replaced by a weaker one, at the later version", () => {
  const f = findings("qa-ts", [
    ["write", F, ts("  expect(total).toBe(3);")],
    ["write", F, ts("  expect(total).toBeDefined();")],
  ]);
  assert.deepEqual(
    f.map((x) => `${x.severity}: ${x.message}`),
    ["high: e2e/cart.spec.ts: total — assertion weakened (expect(total).toBe(3); → expect(total).toBeDefined();)"],
  );
  assert.equal(f[0].seq, 2, "the second write");
  assert.deepEqual(
    found("qa-ts", [
      ["write", F, ts("  expect(total).toBe(3);")],
      ["edit", F, "toBe(3)", "toBeTruthy()"],
    ]),
    ["high: e2e/cart.spec.ts: total — assertion weakened (expect(total).toBe(3); → expect(total).toBeTruthy();)"],
    "an edit of a file the session wrote",
  );
  assert.deepEqual(
    found("qa-ts", [
      ["write", F, ts("  expect(order).toEqual({ id: 1 });")],
      ["write", F, ts("  expect(order).toMatchObject({ id: 1 });")],
    ]),
    ["high: e2e/cart.spec.ts: total — assertion weakened (expect(order).toEqual({ id: 1 }); → expect(order).toMatchObject({ id: 1 });)"],
  );
});

test("Playwright: a web-first assertion of a value or a state replaced by toBeVisible() or toBeAttached() (0.1.125)", () => {
  const box = (m) => `  await expect(page.getByRole("searchbox")).${m};`;
  const weakened = (from, to = "toBeVisible()") =>
    found("qa-ts", [
      ["write", F, ts(box(from))],
      ["write", F, ts(box(to))],
    ]);
  for (const m of [
    "toHaveValue(q)",
    "toHaveValues(['a', 'b'])",
    "toContainText('Owls')",
    "toHaveClass(/active/)",
    "toHaveCSS('color', 'red')",
    "toHaveId('q')",
    "toHaveAccessibleName('Search')",
    "toHaveAccessibleDescription('Type to search')",
    "toHaveRole('searchbox')",
    "toHaveJSProperty('value', 'q')",
    "toHaveScreenshot()",
    "toBeChecked()",
    "toBeEnabled()",
    "toBeDisabled()",
    "toBeEditable()",
    "toBeFocused()",
    "toBeEmpty()",
  ])
    assert.equal(weakened(m).length, 1, m);
  assert.deepEqual(weakened("toHaveValue(q)", "toBeAttached()"), [
    'high: e2e/cart.spec.ts: total — assertion weakened (await expect(page.getByRole("searchbox")).toHaveValue(q); → await expect(page.getByRole("searchbox")).toBeAttached();)',
  ]);
  assert.equal(weakened("toHaveText(q)", "toBeAttached()").length, 1);
  // as strong as before: another value, another state, one weak assertion for another
  assert.deepEqual(weakened("toHaveValue(q)", "toHaveValue('owls')"), []);
  assert.deepEqual(weakened("toBeEnabled()", "toBeDisabled()"), []);
  assert.deepEqual(weakened("toBeVisible()", "toBeAttached()"), []);
  // toBeVisible() of another locator, with the value in it, is a rewrite (seen in an owner's session)
  const rewrite = (a, b) =>
    found("qa-ts", [
      ["write", F, ts(`  await expect(${a};`)],
      ["write", F, ts(`  await expect(${b};`)],
    ]);
  assert.deepEqual(rewrite("page.locator('body')).toContainText(/owls/i)", "page.getByText(/owls/i).first()).toBeVisible()"), []);
  assert.deepEqual(rewrite("page.locator('body')).toHaveClass(/search-open/)", "page.getByText('Start typing')).toBeVisible()"), []);
  // toBeTruthy() needs no same locator, as before
  assert.equal(rewrite("page.locator('body')).toContainText(/owls/i)", "page.getByText(/owls/i)).toBeTruthy()").length, 1);
});

test("a test that loses assertions", () => {
  assert.deepEqual(
    found("qa-ts", [
      ["write", F, ts("  expect(a).toBe(1);\n  expect(b).toBe(2);")],
      ["write", F, ts("  expect(a).toBe(1);")],
    ]),
    ["high: e2e/cart.spec.ts: total — fewer assertions (2 → 1)"],
  );
});

test("a long pair shows what changed, not the start the two lines share (0.1.122; before, both cut at 40 characters)", () => {
  // the demo's case: until 0.1.122 it read "await expect(page.getByRole("alert")).to → await expect(page.getByRole("alert")).to"
  const alert = (m) => `  await expect(page.getByRole("alert")).${m};`;
  assert.deepEqual(
    found("qa-ts", [
      ["write", F, ts(alert('toHaveText("Invalid email or password")'))],
      ["write", F, ts(alert("toBeVisible()"))],
    ]),
    ['high: e2e/cart.spec.ts: total — assertion weakened (….toHaveText("Invalid email or password"); → ….toBeVisible();)'],
  );
  // too long even after the shared start: each side is cut at 60 characters
  const long = "x".repeat(70);
  const reason = (m) => m.slice(m.indexOf("weakened (") + "weakened (".length, -1);
  assert.deepEqual(
    found("qa-ts", [
      ["write", F, ts(`  expect(total).toBe(${long});`)],
      ["write", F, ts(`  expect(total).toBeDefined(); // ${long}`)],
    ]).map(reason),
    [`….toBe(${"x".repeat(53)}… → ….toBeDefined(); // ${"x".repeat(40)}…`],
  );
  assert.deepEqual(
    found("qa-python", [
      ["write", "tests/test_cart.py", py(`    assert cart.total_for(customer_id=${long}) == 3`)],
      ["write", "tests/test_cart.py", py(`    assert cart.total_for(customer_id=${long})`)],
    ]),
    [`high: tests/test_cart.py: test_total — assertion weakened (comparison → truthiness: assert cart.total_for(customer_id=${"x".repeat(25)}…)`],
  );
});

test("Python and Java", () => {
  assert.deepEqual(
    found("qa-python", [
      ["write", "tests/test_cart.py", py("    assert total == 3")],
      ["write", "tests/test_cart.py", py("    assert total")],
    ]),
    ["high: tests/test_cart.py: test_total — assertion weakened (comparison → truthiness: assert total)"],
  );
  assert.deepEqual(
    found("qa-python", [
      ["write", "tests/test_cart.py", py("    assert total == 3")],
      ["write", "tests/test_cart.py", py("    assert total is not None")],
    ]),
    ["high: tests/test_cart.py: test_total — assertion weakened (assert total == 3 → assert total is not None)"],
  );
  assert.deepEqual(
    found("qa-java", [
      ["write", "src/test/java/CartTest.java", java("    assertEquals(3, cart.total());")],
      ["write", "src/test/java/CartTest.java", java("    assertNotNull(cart.total());")],
    ]),
    ["high: src/test/java/CartTest.java: total — assertion weakened (assertEquals(3, cart.total()); → assertNotNull(cart.total());)"],
  );
});

/* 0.1.136, an agent tidying its own new test in the CI lab's pilot 5: a `.not` text check goes while an exact check of the
   same element stays. It said nothing more. The other shapes are still fewer assertions. */
test("a .not text check gone beside an exact check of the same element is no weakening; anything else still is", () => {
  const cfg = Lens.profile("qa-ts");
  const body = (...lines) => `test('a', async ({ page }) => {\n${lines.map((l) => "  " + l).join("\n")}\n});\n`;
  const removed = (a, b) => Lens.compareAsserts(body(...a), body(...b), cfg, "a.spec.ts").removed.length;
  const EXACT = "await expect(titles).toHaveText(['Buy milk']);";
  const NOT = "await expect(titles).not.toHaveText(['Walk']);";
  assert.equal(removed([EXACT, NOT], [EXACT]), 0, "toHaveText");
  assert.equal(removed([EXACT, "await expect(titles).not.toContainText('Walk');"], [EXACT]), 0, "toContainText");
  assert.equal(removed(["await expect(titles).toHaveCount(1);", NOT], ["await expect(titles).toHaveCount(1);"]), 0, "toHaveCount");
  assert.equal(removed([EXACT, NOT, "await expect(titles).not.toHaveText(['Read']);"], [EXACT]), 0, "two of them");
  // another element: the exact check says nothing of it
  assert.equal(removed([EXACT, "await expect(banner).not.toContainText('Error');"], [EXACT]), 1, "another element");
  // no exact check left, or only a .not one
  assert.equal(removed([NOT, "await expect(titles).toBeVisible();"], ["await expect(titles).toBeVisible();"]), 1, "a weak check left");
  assert.equal(removed([NOT, "await expect(titles).not.toHaveCount(0);"], ["await expect(titles).not.toHaveCount(0);"]), 1, "a .not check left");
  // what goes is no .not text check
  assert.equal(removed([EXACT, "await expect(titles).toHaveCount(1);"], [EXACT]), 1, "an exact check goes");
  assert.equal(removed([EXACT, "await expect(titles).not.toBeVisible();"], [EXACT]), 1, "a .not check of another kind");
  // the same line twice, one gone: as before
  assert.equal(removed([EXACT, EXACT], [EXACT]), 1, "a duplicate");
  // beside a .not check, another one goes too
  assert.equal(removed([EXACT, NOT, "await expect(other).toHaveCount(1);"], [EXACT]), 1, "and one more");
});

test("an assertion commented out counts as removed: TypeScript, Java, C#, Cypress (0.1.120)", () => {
  const removed = (file, test) => [`high: ${file}: ${test} — fewer assertions (2 → 1)`];
  const two = ts("  expect(a).toBe(1);\n  expect(b).toBe(2);");
  assert.deepEqual(
    found("qa-ts", [
      ["write", F, two],
      ["write", F, ts("  expect(a).toBe(1);\n  // expect(b).toBe(2);")],
    ]),
    removed(F, "total"),
  );
  assert.deepEqual(
    found("qa-ts", [
      ["write", F, two],
      ["edit", F, "  expect(b)", "  // expect(b)"],
    ]),
    removed(F, "total"),
    "by an Edit",
  );
  assert.deepEqual(
    found("qa-ts", [
      ["write", F, two],
      ["write", F, ts("  expect(a).toBe(1);\n  /* expect(b).toBe(2); */")],
    ]),
    removed(F, "total"),
  );
  const J = "src/test/java/CartTest.java";
  assert.deepEqual(
    found("qa-java", [
      ["write", J, java("    assertEquals(1, cart.a());\n    assertEquals(2, cart.b());")],
      ["write", J, java("    assertEquals(1, cart.a());\n    // assertEquals(2, cart.b());")],
    ]),
    removed(J, "total"),
  );
  const C = "Tests/CartTests.cs";
  const cs = (b) => `public class CartTests {\n  [Test]\n  public void Total() {\n${b}\n  }\n}\n`;
  assert.deepEqual(
    found("qa-c#", [
      ["write", C, cs("    Assert.AreEqual(1, cart.A);\n    Assert.AreEqual(2, cart.B);")],
      ["write", C, cs("    Assert.AreEqual(1, cart.A);\n    // Assert.AreEqual(2, cart.B);")],
    ]),
    removed(C, "Total"),
  );
  const Y = "cypress/e2e/cart.cy.js";
  const cy = (b) => `it('total', () => {\n${b}\n});\n`;
  assert.deepEqual(
    found("qa-cypress", [
      ["write", Y, cy("  cy.get('.total').should('have.text', '3');\n  cy.get('tr').should('have.length', 2);")],
      ["write", Y, cy("  cy.get('.total').should('have.text', '3');\n  // cy.get('tr').should('have.length', 2);")],
    ]),
    removed(Y, "total"),
  );
});

test("an assertion inside a block comment counts as removed, also on a line without a leading * (0.1.121)", () => {
  const two = ts("  expect(a).toBe(1);\n  expect(b).toBe(2);");
  assert.deepEqual(
    found("qa-ts", [
      ["write", F, two],
      ["write", F, ts("  expect(a).toBe(1);\n  /*\n  expect(b).toBe(2);\n  */")],
    ]),
    [`high: ${F}: total — fewer assertions (2 → 1)`],
  );
  const J = "src/test/java/CartTest.java";
  assert.deepEqual(
    found("qa-java", [
      ["write", J, java("    assertEquals(1, cart.a());\n    assertEquals(2, cart.b());")],
      ["edit", J, "    assertEquals(2, cart.b());", "    /*\n    assertEquals(2, cart.b());\n    */"],
    ]),
    [`high: ${J}: total — fewer assertions (2 → 1)`],
    "by an Edit",
  );
});

test("not reported: an assertion commented out in both versions, or one brought back from a comment (0.1.120)", () => {
  const was = ts("  expect(a).toBe(1);\n  // expect(b).toBe(2);");
  assert.deepEqual(
    found("qa-ts", [
      ["write", F, was],
      ["write", F, ts("  expect(a).toBe(3);\n  // expect(b).toBe(2);")],
    ]),
    [],
  );
  assert.deepEqual(
    found("qa-ts", [
      ["write", F, was],
      ["write", F, ts("  expect(a).toBe(1);\n  expect(b).toBe(2);")],
    ]),
    [],
  );
});

test("the same test shown twice in messages (a chat session)", () => {
  assert.deepEqual(
    found("qa-ts", [
      ["say", "```ts\n" + ts("  expect(total).toBe(3);") + "```"],
      ["say", "Fixed:\n```ts\n" + ts("  expect(total).toBeDefined();") + "```"],
    ]),
    ["high: code in messages (version 2): total — assertion weakened (expect(total).toBe(3); → expect(total).toBeDefined();)"],
  );
});

test("not reported: a first version, a stronger or equal assertion, an added one, a renamed test, another test changed", () => {
  assert.deepEqual(found("qa-ts", [["write", F, ts("  expect(total).toBeDefined();")]]), [], "nothing to compare with");
  assert.deepEqual(
    found("qa-ts", [
      ["write", F, ts("  expect(total).toBeDefined();")],
      ["write", F, ts("  expect(total).toBe(3);")],
    ]),
    [],
    "stronger",
  );
  assert.deepEqual(
    found("qa-ts", [
      ["write", F, ts("  expect(total).toBe(3);")],
      ["write", F, ts("  expect(total).toEqual(3);")],
    ]),
    [],
    "as strong",
  );
  assert.deepEqual(
    found("qa-ts", [
      ["write", F, ts("  expect(total).toBeDefined();")],
      ["write", F, ts("  expect(total).toBeTruthy();")],
    ]),
    [],
    "weak before and after: weak_assert reports it, nothing was weakened",
  );
  assert.deepEqual(
    found("qa-ts", [
      ["write", F, ts("  expect(a).toBe(1);")],
      ["write", F, ts("  expect(a).toBe(1);\n  expect(b).toBe(2);")],
    ]),
    [],
    "an assertion added",
  );
  assert.deepEqual(
    found("qa-ts", [
      ["write", F, ts("  expect(a).toBe(1);\n  expect(b).toBe(2);")],
      ["write", F, "test('sum', async () => {\n  expect(a).toBe(1);\n});\n"],
    ]),
    [],
    "a renamed test is another test (test_deleted looks at the old one)",
  );
  const two = (b) => `test('total', async () => {\n  expect(a).toBe(1);\n});\ntest('count', async () => {\n  ${b}\n});\n`;
  assert.deepEqual(
    found("qa-ts", [
      ["write", F, two("expect(b).toBe(2);")],
      ["write", F, two("expect(b).toBe(5);")],
    ]),
    [],
    "another value, as strong",
  );
});

/* 0.1.139: moved, not lost. In the owner's session a review moved a helper's two checks into the step of the test that
   calls it (a step checks what its title promises), and another test now called assertion helpers (expectAlert(page,
   …)): both read as fewer assertions. A line counts as moved when, by the end of the person's request, the files the
   session knows hold it at least as many times as before the edit; a call of an expect…() helper, a plain function too,
   counts as the assertions it holds. */
test("not reported: assertions moved to the test that calls the helper, or into an expect…() helper", () => {
  const H = "helpers/reset.ts";
  const CURRENT = "  await expect(form(page).current).toBeVisible();";
  const LOCK = "  await expect(form(page).lock, 'the lock button').toBeVisible();";
  const helper = (body) => `export async function openReset(page) {\n  await page.goto('/reset');\n${body}\n}\n`;
  const spec = (body) => `test('change password', async ({ page }) => {\n  await openReset(page);\n${body}\n});\n`;
  const steps = (...between) => [
    ["write", H, helper(`${CURRENT}\n${LOCK}`)],
    ["write", F, spec("  await expect(page).toHaveURL(/reset/);")],
    ["user", "Plan approved"],
    ["write", H, helper("")],
    ...between,
    ["write", F, spec(`  await expect(page).toHaveURL(/reset/);\n${CURRENT}\n${LOCK}`)],
  ];
  assert.deepEqual(found("qa-ts", steps()), [], "moved to the spec later in the same request");
  // the person's next message ends the request: moved later is a check lost now
  assert.deepEqual(found("qa-ts", steps(["user", "Now the spec"])), [`high: ${H}: openReset — fewer assertions (2 → 0)`]);
  // a copy that was there already is no move: the lines must not be fewer in all than before
  const copy = [["write", "e2e/other.spec.ts", spec(`${CURRENT}\n${LOCK}`)], ...steps().slice(0, 4)];
  assert.deepEqual(found("qa-ts", copy), [`high: ${H}: openReset — fewer assertions (2 → 0)`], "a copy elsewhere before");
  // a test that now calls an assertion helper, a plain function
  assert.deepEqual(
    found("qa-ts", [
      ["write", F, ts("  expect(alert).toHaveText('Wrong');\n  expect(form).toBeVisible();")],
      ["write", F, ts("  await expectAlert(page, 'Wrong');\n  expect(form).toBeVisible();")],
    ]),
    [],
  );
});

/* 0.1.140: an assertion moved to another function of the same file and written anew there. In the owner's session the
   agent rewrote helpers/login.ts by its approved plan: expectDashboard's check of the Logout link (a raw locator) went
   to logoutViaMenu, where the menu is open, and the file went from 8 assertions to 10: "expectDashboard: 3 → 2", high. */
test("not reported: an assertion moved within the file and written anew; reported when its sign changed or nothing came", () => {
  const H = "helpers/login.ts";
  const helper = (dash, logout) =>
    "export async function expectDashboard(page: Page, cid: string): Promise<void> {\n" +
    "  await expect(page).toHaveURL(/\\/dashboard$/);\n" +
    dash +
    "\n}\n\nexport async function logoutViaMenu(page: Page, cid: string): Promise<void> {\n" +
    "  await customerMenu(page, cid).click();\n" +
    "  const logout = page.getByRole('menu').getByRole('link', { name: 'Logout' });\n" +
    logout +
    "\n  await logout.click();\n}\n";
  const OLD = helper(
    "  await expect(page.locator('nav').getByText(cid, { exact: true })).toBeVisible();\n  await expect(page.locator('a[href=\"/logout\"]')).toHaveCount(1);",
    "",
  );
  const dash = "  await expect(customerMenu(page, cid)).toBeVisible();";
  const moved = helper(dash, "  await expect(logout, 'the menu has Logout').toBeVisible();");
  assert.deepEqual(
    found("qa-ts", [
      ["write", H, OLD],
      ["write", H, moved],
    ]),
    [],
    "moved to logoutViaMenu",
  );
  const lost = "high: helpers/login.ts: expectDashboard — fewer assertions (3 → 2)";
  // the sign changed: the menu has no Logout now
  assert.deepEqual(
    found("qa-ts", [
      ["write", H, OLD],
      ["write", H, helper(dash, "  await expect(logout).not.toBeVisible();")],
    ]),
    [lost],
    "the opposite",
  );
  // nothing came in its place: fewer assertions in the file
  assert.deepEqual(
    found("qa-ts", [
      ["write", H, OLD],
      ["write", H, helper(dash, "")],
    ]),
    [lost],
    "gone",
  );
  // what came elsewhere checks something else
  assert.deepEqual(
    found("qa-ts", [
      ["write", H, OLD],
      ["write", H, helper(dash, "  await expect(page.getByText('Bye')).toBeVisible();")],
    ]),
    [lost],
    "another check",
  );
  // an assertion the other function already had is not one moved there
  const had = "  await expect(logout, 'the menu has Logout').toBeVisible();";
  const bye = "\n  await expect(page.getByText('Bye')).toBeVisible();";
  const OLD_HAD = OLD.replace("  const logout = page.getByRole('menu').getByRole('link', { name: 'Logout' });\n", "$&" + had);
  assert.deepEqual(
    found("qa-ts", [
      ["write", H, OLD_HAD],
      ["write", H, helper(dash, had + bye)],
    ]),
    [lost],
    "already there (the file keeps its count with a new check of something else)",
  );
  // moved, but the file lost another assertion: fewer in the file
  assert.deepEqual(
    found("qa-ts", [
      ["write", H, OLD.replace("\n  await logout.click();", bye + "\n  await logout.click();")],
      ["write", H, moved],
    ]),
    [lost],
    "fewer in the file",
  );
  // Python: a check moved to another fixture and written anew
  const C = "tests/conftest.py";
  const fix = (a, b) => `@pytest.fixture\ndef raw():\n${a}    return load(FIXTURE)\n\n\n@pytest.fixture\ndef client():\n${b}    yield TestClient(app)\n`;
  assert.deepEqual(
    found("qa-python", [
      ["write", C, fix("", '    assert DEFAULT_PATH.is_file(), "run: make fixture"\n')],
      ["write", C, fix('    assert FIXTURE.is_file(), "run: make fixture"\n', "")],
    ]),
    [],
  );
  assert.equal(
    found("qa-python", [
      ["write", C, fix("", "    assert len(rows) > 100\n")],
      ["write", C, fix("    assert not any(rows)\n", "")],
    ]).length,
    1,
    "the opposite",
  );
  assert.equal(
    found("qa-python", [
      ["write", C, fix("", '    assert DEFAULT_PATH.is_file(), "run: make fixture"\n')],
      ["write", C, fix("    assert settings.ready\n", "")],
    ]).length,
    1,
    "only the word assert in common",
  );
});

test("a session imported before 0.1.140 with fewer assertions and no `added` asks to be imported again, and keeps its finding", () => {
  const cfg = Lens.profile("qa-ts");
  const ev = [
    { seq: 0, kind: "user", text: "Review" },
    {
      seq: 1,
      kind: "write",
      file: "helpers/a.ts",
      new_content: "export function f() {\n}\n",
      assert_delta: { old: 1, new: 1, weakened: [], removed: [{ test: "f", before: 1, after: 0, lines: [{ line: "expect(a).toBe(1);", old: 1, now: 0 }] }] },
    },
  ];
  assert.equal(Lens.runChecks(ev, cfg).filter((f) => f.check === "assert_weakened").length, 1);
  assert.equal(Lens.IMPORT_GEN, 16);
  assert.equal(Lens.needsReimport({ profile: "qa-ts", importGen: 15, events: ev }), true);
  ev[1].assert_delta.removed[0].added = [];
  assert.equal(Lens.needsReimport({ profile: "qa-ts", importGen: 15, events: ev }), false);
});
