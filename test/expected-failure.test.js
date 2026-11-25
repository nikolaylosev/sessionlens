"use strict";
/* expected_failure: a test marked as one that is expected to fail (Playwright's test.fail, pytest's xfail), medium, with
   the number of them in the file. What must not count: a skip (test.fixme, @Disabled, Ignore are sleep_or_skip_added's,
   since 0.1.113), an assertion about an exception, and commented-out code (0.1.121, commented-out-code.test.js).

   Since 0.1.121 (gaps found while writing this file): Jest's it.failing / test.failing, and pytest's xfail only as the
   marker or the call, not as a word in a docstring or a string.
   Not a gap: Java and C# have the check but no pattern, since JUnit, TestNG, NUnit, xUnit and MSTest have no "expected
   to fail" marker (`@Test(expected = …)` and `assertThrows` expect an exception, which is a passing test). */
const test = require("node:test");
const assert = require("node:assert/strict");
const { load } = require("./helpers");

const { Lens } = load();

const found = (profile, file, content) =>
  Lens.runChecks([{ seq: 1, kind: file ? "write" : "message", file, text: "", new_content: content }], Lens.profile(profile))
    .filter((f) => f.check === "expected_failure")
    .map((f) => `${f.severity}: ${f.message}`);
const msg = (file, n) =>
  `medium: ${file}: ${n} ${n === 1 ? "test" : "tests"} marked as an expected failure — the suite reports green while the bug ${n === 1 ? "it documents" : "they document"} is open`;
// a bug named in the call (0.1.139): low, the same count
const ref = (file, n) =>
  `low: ${file}: ${n} ${n === 1 ? "test" : "tests"} marked as an expected failure, with the bug named in the code — the suite reports green while it is open`;
const TS = "e2e/cart.spec.ts",
  PY = "tests/test_cart.py";

test("Playwright's test.fail: as a test, inside a test, with a condition", () => {
  assert.deepEqual(found("qa-ts", TS, 'test.fail("total", async () => {});\n'), [msg(TS, 1)]);
  assert.deepEqual(found("qa-ts", TS, 'test("total", async () => {\n  test.fail();\n});\n'), [msg(TS, 1)]);
  assert.deepEqual(found("qa-ts", TS, 'test("total", async ({ browserName }) => {\n  test.fail(browserName === "webkit", "bug 12");\n});\n'), [ref(TS, 1)]);
});

test("one finding per file, counting the marked tests", () => {
  assert.deepEqual(found("qa-ts", TS, 'test.fail("a", async () => {});\ntest.fail("b", async () => {});\n'), [msg(TS, 2)]);
});

test("pytest's xfail: the marker, strict, and the call inside a test", () => {
  assert.deepEqual(found("qa-python", PY, '@pytest.mark.xfail(reason="bug 12")\ndef test_total():\n    pass\n'), [ref(PY, 1)]);
  assert.deepEqual(found("qa-python", PY, "@pytest.mark.xfail(strict=True)\ndef test_total():\n    pass\n"), [msg(PY, 1)]);
  assert.deepEqual(found("qa-python", PY, 'def test_total():\n    pytest.xfail("bug 12")\n'), [ref(PY, 1)]);
});

test("Jest's expected failure: it.failing, test.failing, test.failing.each (0.1.121)", () => {
  assert.deepEqual(found("qa-ts", TS, 'it.failing("total", () => {});\n'), [msg(TS, 1)]);
  assert.deepEqual(found("qa-ts", TS, 'test.failing("total", () => {});\n'), [msg(TS, 1)]);
  assert.deepEqual(found("qa-ts", TS, 'test.failing.each([1, 2])("total %i", () => {});\n'), [msg(TS, 1)]);
});

test("xfail as a word is not a marker: a docstring, a string, a name (0.1.121)", () => {
  assert.deepEqual(found("qa-python", PY, 'def test_total():\n    """Shows xfail in the report."""\n'), []);
  assert.deepEqual(found("qa-python", PY, 'def test_status():\n    assert status != "xfail"\n'), []);
  assert.deepEqual(found("qa-python", PY, "def test_report():\n    assert report.xfailed == 0\n"), []);
  assert.deepEqual(found("qa-python", PY, '@mark.xfail(reason="bug 12")\ndef test_total():\n    pass\n'), [ref(PY, 1)], "mark imported from pytest");
});

test("code shown in a message is checked too", () => {
  assert.deepEqual(found("qa-ts", undefined, 'test.fail("total", async () => {});'), [msg("code in message", 1)]);
});

test("not an expected failure: a skip, an expected exception, a method named like one", () => {
  assert.deepEqual(found("qa-ts", TS, 'test.fixme("total", async () => {});\n'), [], "a skip: sleep_or_skip_added");
  assert.deepEqual(found("qa-java", "src/test/java/CartTest.java", '@Test\n@Disabled("bug 12")\nvoid total() {}\n'), []);
  assert.deepEqual(found("qa-c#", "tests/CartTests.cs", '[Test, Ignore("bug 12")] public void Total() {}\n'), []);
  assert.deepEqual(found("qa-java", "src/test/java/CartTest.java", "@Test void pay() { assertThrows(PaymentException.class, () -> cart.pay()); }\n"), []);
  assert.deepEqual(found("qa-ts", TS, "const failures = await test.failures();\n"), []);
});

test("not reported: commented out", () => {
  assert.deepEqual(found("qa-ts", TS, '// test.fail("total", async () => {});\n'), []);
  assert.deepEqual(found("qa-python", PY, '# @pytest.mark.xfail(reason="bug 12")\ndef test_total():\n    pass\n'), []);
});

/* 0.1.139, owner's decision. The person asked for it: no finding (the decision is made; in the owner's session the task
   said "оформить как известную ошибку (`test.fail()` с ссылкой на F-01)"). The bug named in the call: low. */
const withAsk = (ask, content, profile = "qa-ts", file = TS) =>
  Lens.runChecks(
    [
      { seq: 0, kind: "user", text: ask },
      { seq: 1, kind: "write", file, text: "", new_content: content },
    ],
    Lens.profile(profile),
  )
    .filter((f) => f.check === "expected_failure")
    .map((f) => `${f.severity}: ${f.message}`);
const FAIL = 'test("total", async () => {\n  test.fail();\n});\n';

test("not reported: the person asked for an expected failure (0.1.139)", () => {
  for (const ask of [
    "Тест не подгонять под это поведение: оформить как известную ошибку (`test.fail()` с ссылкой на F-01).",
    "Mark it with test.fail() until the bug is fixed.",
    "Keep it as a known failure.",
    "Make it an expected failure.",
    "Use it.failing for now.",
    "Пусть тест ожидаемо падает.",
  ])
    assert.deepEqual(withAsk(ask, FAIL), [], ask);
  assert.deepEqual(withAsk("Mark it xfail, bug 12.", '@pytest.mark.xfail(reason="see the notes")\ndef test_total():\n    pass\n', "qa-python", PY), []);
});

test("still reported: no request, a request against it, or one after the code (0.1.139)", () => {
  for (const ask of [
    "Write the tests for the cart.",
    "Don't use test.fail(), fix the test.",
    "Do not mark anything as an expected failure.",
    "Никаких test.fail: тест должен быть честным, без xfail.",
    "Не оформлять как известную ошибку.",
  ])
    assert.deepEqual(withAsk(ask, FAIL), [msg(TS, 1)], ask);
  const late = Lens.runChecks(
    [
      { seq: 1, kind: "write", file: TS, text: "", new_content: FAIL },
      { seq: 2, kind: "user", text: "Mark it with test.fail()." },
    ],
    Lens.profile("qa-ts"),
  ).filter((f) => f.check === "expected_failure");
  assert.equal(late.length, 1, "asked after the code was written");
});

test("low: every marked test names its bug in the call (0.1.139)", () => {
  for (const call of [
    "test.fail(true, 'F-01 (qa/FINDINGS.md): Lilith answers 405');",
    'test.fail(true, "JIRA-123");',
    'test.fail(true, "see #42");',
    'test.fail(true, "https://tracker.example/b/7");',
    'test.fail(true, "баг 7");',
    'test.fail(\n    browserName === "webkit",\n    "ABC-9: the total is wrong",\n  );',
  ])
    assert.deepEqual(found("qa-ts", TS, `test("total", async () => {\n  ${call}\n});\n`), [ref(TS, 1)], call);
  assert.deepEqual(found("qa-ts", TS, 'test.fail("F-01: total", async () => {});\n'), [ref(TS, 1)], "in the title of test.fail as a test");
  // one of two without it: medium, for both
  assert.deepEqual(found("qa-ts", TS, 'test.fail("a", async () => {});\ntest("b", async () => {\n  test.fail(true, "F-02");\n});\n'), [msg(TS, 2)]);
  // not a bug: a number alone, a word without a number, a lower-case word with a number, a reference after the call
  assert.deepEqual(found("qa-ts", TS, 'test("total", async () => {\n  test.fail(true, "utf-8 names break, retry-3");\n});\n'), [msg(TS, 1)]);
  assert.deepEqual(found("qa-ts", TS, 'test("total", async () => {\n  test.fail(true, "flaky on CI 2 times");\n});\n'), [msg(TS, 1)]);
  assert.deepEqual(found("qa-ts", TS, 'test("total", async () => {\n  test.fail(true, "a known bug");\n});\n'), [msg(TS, 1)]);
  assert.deepEqual(found("qa-ts", TS, 'test("total", async () => {\n  test.fail(true, "wrong total"); // F-03\n});\n'), [msg(TS, 1)]);
  assert.deepEqual(found("qa-ts", TS, 'test("total", async () => {\n  test.fail(true, "wrong total"); note("F-03");\n});\n'), [msg(TS, 1)]);
});

test("the profiles that run it", () => {
  const profiles = ["qa-ts", "qa-cypress", "qa-detox", "qa-python", "qa-java", "qa-c#", "qa-api", "qa-mobile", "qa-robot", "qa-generic"];
  assert.deepEqual(
    profiles.filter((p) => Lens.profile(p).checks.includes("expected_failure")),
    ["qa-ts", "qa-cypress", "qa-detox", "qa-python", "qa-java", "qa-c#", "qa-api", "qa-mobile"],
  );
});
