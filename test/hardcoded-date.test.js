"use strict";
/* hardcoded_date: a calendar date on an assertion line. What must not count: a date in a variable outside the
   assertion, an assertion without a date, a commented-out assertion (a comment never runs; reported until 0.1.118). */
const test = require("node:test");
const assert = require("node:assert/strict");
const { load } = require("./helpers");

const { Lens } = load();

const found = (file, content, profile = "qa-ts") =>
  Lens.runChecks([{ seq: 1, kind: "write", file, new_content: content }], Lens.profile(profile))
    .filter((f) => f.check === "hardcoded_date")
    .map((f) => `${f.severity}: ${f.message}`);

test("a date in an assertion is reported", () => {
  assert.deepEqual(found("e2e/deadline.spec.ts", "expect(text).toHaveText('Deadline March 15, 2026');\n"), [
    "medium: e2e/deadline.spec.ts: date in an assertion “expect(text).toHaveText('Deadline March 15, 2026');” — will go red when content changes",
  ]);
  assert.deepEqual(found("e2e/deadline.spec.ts", "await expect(page.getByText('2026-03-15')).toBeVisible();\n"), [
    "medium: e2e/deadline.spec.ts: date in an assertion “await expect(page.getByText('2026-03-15')).toBeVisible();” — will go red when content changes",
  ]);
});

test("not reported: a date outside an assertion, or an assertion without a date", () => {
  assert.deepEqual(found("e2e/deadline.spec.ts", "const deadline = '2026-03-15';\nexpect(text).toMatch(/Deadline/);\n"), []);
  assert.deepEqual(found("e2e/deadline.spec.ts", "expect(page.getByRole('heading', { name: 'Paid' })).toBeVisible();\n"), []);
});

test("Python: date(…) and datetime(…) with a year in numbers in an assertion (0.1.129)", () => {
  const F = "tests/test_orders.py";
  const py = (line) => found(F, `def test_order():\n    ${line}\n`, "qa-python");
  for (const line of [
    "assert order.created == date(2026, 10, 16)",
    "assert order.created == datetime.date(2026, 10, 16)",
    "assert order.paid_at == datetime(2026, 10, 16, 9, 30, tzinfo=timezone.utc)",
    "assert order.paid_at == datetime.datetime( 2026 , 1, 1)",
    "assert order.created == date(year=2026, month=10, day=16)",
  ])
    assert.deepEqual(py(line), [`medium: ${F}: date in an assertion “${line}” — will go red when content changes`], line);
  // a date computed at run time, a year from a variable, a date outside an assertion, another function's name
  for (const line of [
    "assert order.created == date.today()",
    "assert order.created == date(year, 10, 16)",
    "want = date(2026, 10, 16)",
    "assert update(2026, 10) == 1",
    "assert to_date(2026, 10) == x",
  ])
    assert.deepEqual(py(line), [], line);
  // JavaScript's Date and C#'s DateTime are not asked for
  assert.deepEqual(found("e2e/order.spec.ts", "expect(order.created).toEqual(new Date(2026, 9, 16));\n"), []);
});

test("not reported: a commented-out assertion with a date; the code line next to it still is", () => {
  assert.deepEqual(found("e2e/deadline.spec.ts", "// expect(text).toHaveText('2026-03-15');\nexpect(text).toMatch(/Deadline/);\n"), []);
  assert.deepEqual(found("e2e/deadline.spec.ts", "/* expect(text).toHaveText('March 15, 2026'); */\n"), []);
  assert.deepEqual(found("e2e/deadline.spec.ts", "/**\n * expect(text).toHaveText('2026-03-15');\n */\n"), []);
  assert.deepEqual(
    found("tests/test_deadline.py", "def test_deadline():\n    # assert page.title == 'March 15, 2026'\n    assert page.title\n", "qa-python"),
    [],
  );
  assert.deepEqual(found("e2e/deadline.spec.ts", "// the old check\nexpect(text).toHaveText('2026-03-15');\n"), [
    "medium: e2e/deadline.spec.ts: date in an assertion “expect(text).toHaveText('2026-03-15');” — will go red when content changes",
  ]);
});
