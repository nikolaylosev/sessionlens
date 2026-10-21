"use strict";
/* empty_result_unverified (0.1.130): a test asks something (an HTTP call, a query, a search) and expects an empty result,
   and no test of the same file expects one that is not empty: a broken query, a wrong filter or an empty test database
   pass it too. In Python, TypeScript, Java and C#, one finding per such test, at the last version of the file. What
   must not count: a non-empty expectation anywhere in the file (len > 0, a list with items, `in`, toContain, hasSize(2),
   Assert.NotEmpty…), a UI element that is not there (toHaveCount(0)), a new object's first state with no query, a
   commented-out assertion. */
const test = require("node:test");
const assert = require("node:assert/strict");
const { load } = require("./helpers");

const { Lens } = load();
const found = (profile, file, ...versions) =>
  Lens.runChecks(
    versions.map((code, i) => ({ seq: i + 1, kind: "write", file, new_content: code })),
    Lens.profile(profile),
  )
    .filter((f) => f.check === "empty_result_unverified")
    .map((f) => `${f.severity}: ${f.message}`);
const msg = (file, t, line) =>
  `medium: ${file}: ${t} — expects an empty result (${line}), and no test of the file expects one that is not: a broken query or filter would pass it too`;

const PY_EMPTY = 'def test_no_paid_orders(client):\n    r = client.get("/orders?status=paid")\n    assert r.json() == []\n';
const PY_LEN = 'def test_no_refunds(client):\n    assert len(client.get("/refunds").json()) == 0\n';

test("Python: an empty result of a query, and nothing non-empty in the file: one finding per test", () => {
  const F = "tests/test_orders.py";
  assert.deepEqual(found("qa-python", F, PY_EMPTY + "\n" + PY_LEN), [
    msg(F, "test_no_paid_orders", "assert r.json() == []"),
    msg(F, "test_no_refunds", 'assert len(client.get("/refunds").json()) == 0'),
  ]);
  assert.deepEqual(found("qa-api", F, PY_EMPTY), [msg(F, "test_no_paid_orders", "assert r.json() == []")], "qa-api too");
});

test("not reported: a non-empty expectation anywhere in the file", () => {
  const F = "tests/test_orders.py";
  for (const other of [
    'def test_new_orders(client):\n    assert len(client.get("/orders?status=new").json()) > 0\n',
    'def test_new_orders(client):\n    assert client.get("/orders?status=new").json() == [{"id": 1}]\n',
    'def test_new_order(client):\n    assert {"id": 1} in client.get("/orders").json()\n',
    'def test_count(client):\n    assert len(client.get("/orders").json()) == 3\n',
  ])
    assert.deepEqual(found("qa-python", F, PY_EMPTY + "\n" + other), [], other);
  // `not in` says nothing about the list having items
  assert.equal(found("qa-python", F, PY_EMPTY + '\ndef test_no_ghost(client):\n    assert {"id": 9} not in client.get("/orders").json()\n').length, 1);
});

test("TypeScript: toHaveLength(0) and toEqual([]) of a response; not a UI element that is not there, not a new object", () => {
  const F = "tests/orders.test.ts";
  const empty = "it('lists none', async () => {\n  const r = await request(app).get('/orders?status=paid');\n  expect(r.body).toHaveLength(0);\n});\n";
  assert.deepEqual(found("qa-ts", F, empty), [msg(F, "lists none", "expect(r.body).toHaveLength(0);")]);
  const some = "it('lists some', async () => {\n  const r = await request(app).get('/orders');\n  expect(r.body.length).toBeGreaterThan(0);\n});\n";
  assert.deepEqual(found("qa-ts", F, empty + some), []);
  assert.deepEqual(found("qa-ts", F, empty + "it('has one', async () => {\n  expect((await request(app).get('/orders')).body).toContain(order);\n});\n"), []);
  assert.deepEqual(
    found(
      "qa-ts",
      "e2e/search.spec.ts",
      "test('nothing found', async ({ page }) => {\n  await page.goto('/search?q=zz');\n  await expect(page.locator('.result')).toHaveCount(0);\n});\n",
    ),
    [],
    "UI",
  );
  assert.deepEqual(found("qa-ts", "tests/cart.test.ts", "it('starts empty', () => {\n  expect(new Cart().items).toEqual([]);\n});\n"), [], "no query");
  assert.deepEqual(
    found(
      "qa-ts",
      F,
      "it('lists none', async () => {\n  const r = await request(app).get('/orders?status=paid');\n  // expect(r.body).toHaveLength(0);\n  expect(r.status).toBe(200);\n});\n",
    ),
    [],
    "commented out",
  );
});

test("Java and C#: an empty repository result or response; a non-empty one in the file is enough", () => {
  const J = "src/test/java/OrderRepositoryTest.java";
  const jEmpty = 'class OrderRepositoryTest {\n  @Test\n  void noPaidOrders() {\n    assertThat(repo.findByStatus("paid")).isEmpty();\n  }\n}\n';
  assert.deepEqual(found("qa-java", J, jEmpty), [msg(J, "noPaidOrders", 'assertThat(repo.findByStatus("paid")).isEmpty();')]);
  const jSome = jEmpty.replace("}\n}\n", '}\n  @Test\n  void newOrders() {\n    assertThat(repo.findByStatus("new")).hasSize(2);\n  }\n}\n');
  assert.deepEqual(found("qa-java", J, jSome), []);
  const C = "tests/OrdersTests.cs";
  const cEmpty =
    'public class OrdersTests {\n  [Fact]\n  public async Task NoPaid() {\n    var list = await client.GetFromJsonAsync<List<Order>>("/orders?status=paid");\n    Assert.Empty(list);\n  }\n}\n';
  assert.deepEqual(found("qa-c#", C, cEmpty), [msg(C, "NoPaid", "Assert.Empty(list);")]);
  assert.deepEqual(
    found(
      "qa-c#",
      C,
      cEmpty.replace("Assert.Empty(list);", 'Assert.Empty(list);\n    Assert.NotEmpty(await client.GetFromJsonAsync<List<Order>>("/orders"));'),
    ),
    [],
  );
});

test("the last version of the file counts: a non-empty test removed later leaves the empty one alone", () => {
  const F = "tests/test_orders.py";
  const both = PY_EMPTY + '\ndef test_new_orders(client):\n    assert len(client.get("/orders?status=new").json()) > 0\n';
  assert.deepEqual(found("qa-python", F, PY_EMPTY, both), []);
  assert.deepEqual(found("qa-python", F, both, PY_EMPTY), [msg(F, "test_no_paid_orders", "assert r.json() == []")]);
});
