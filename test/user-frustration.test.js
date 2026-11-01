"use strict";
/* user_frustration: a short user message that sounds like a correction, or the same request sent twice (the first 40
   characters). English and Russian. What must not count: a long dump, a new request that only shares a word, a phrase
   inside another word, and since 0.1.135 "again" or what to test ("a wrong password", "the undo button") in a message
   that opens with a request. */
const test = require("node:test");
const assert = require("node:assert/strict");
const { load } = require("./helpers");

const { Lens } = load();

function transcript(users) {
  return users.map((text) => JSON.stringify({ type: "user", message: { role: "user", content: text } })).join("\n");
}
const found = (users) => {
  const cfg = Lens.profile("qa-ts");
  return Lens.runChecks(Lens.importAny(transcript(users), cfg), cfg)
    .filter((f) => f.check === "user_frustration")
    .map((f) => `${f.severity}: ${f.message}`);
};

test("a correction phrase, and the same request twice", () => {
  assert.deepEqual(found(["Write the tests", "not what i asked"]), [
    "medium: User frustration signal: “not what i asked” — the agent misunderstood the task a step earlier",
  ]);
  assert.deepEqual(found(["Please cover the discount on the cart total", "Please cover the discount on the cart total"]), [
    "medium: User repeated the same request: “Please cover the discount on the cart total”",
  ]);
});

test("a Russian correction, and a repeat of the first 40 characters", () => {
  assert.deepEqual(found(["Напиши тесты", "Не то, верни как было"]), [
    "medium: User frustration signal: “Не то, верни как было” — the agent misunderstood the task a step earlier",
  ]);
  // the same first 40 characters is a repeat, a difference at the 40th is not (the boundary from both sides)
  const head = "Please add a test for the cart discount ";
  assert.equal(head.length, 40);
  assert.deepEqual(found([head + "ten percent", head + "zero"]), [`medium: User repeated the same request: “${head}zero”`]);
  assert.deepEqual(found([head.slice(0, 39) + "s of ten percent", head.slice(0, 39) + "! zero"]), [], "different at the 40th");
});

/* 0.1.135: "ещё раз", "снова" and "again" in a message that opens with a request ask for something. From the owner's
   sessions: "запусти еще раз", "Попробуй с Gemini ещё раз", "опиши кейс ещё раз". */
test("again and what to test in a request are no signal; alone, or a correction beside them, they still are", () => {
  const signal = (text) => [`medium: User frustration signal: “${text}” — the agent misunderstood the task a step earlier`];
  for (const text of [
    "запусти еще раз",
    "Запусти ещё раз",
    "Попробуй с Gemini ещё раз",
    "опиши кейс ещё раз",
    "прогони тесты снова",
    "Пожалуйста, запусти ещё раз",
    "давай проверь снова",
    "run it again",
    "Try again",
    "please run the tests again",
    "Check the login page again.",
    "запусти снова, ещё раз",
    // the owner's sessions: the verbs "выведи" and "проанализируй", with its typo
    "выведи полный план еще раз",
    "Пронализируй тесты еще раз после изменений",
    "Проанализируй тесты ещё раз",
    // what to test, not a reaction
    "Add a test for a wrong password",
    "Write a test that a wrong email shows an error",
    "Проверь вход с wrong паролем",
    "Add a test for the undo button",
    "Test the revert button on the settings page",
    "Напиши тест: верни 404 на неизвестный id",
    "Fix the undo test",
  ])
    assert.deepEqual(found(["Write the tests", text]), [], text);
  for (const text of [
    "ещё раз",
    "Опять упало",
    "again?",
    "Why again?",
    "Снова не работает",
    "Тесты снова падают",
    // a request with a correction beside it
    "сделай ещё раз, не то",
    "Run it again, this is wrong",
    "запусти ещё раз, я же сказал",
    // опять stays a signal in a request: it says the same mistake came back
    "проверь, опять упало",
    // a word that only starts like a request
    "Trying again",
    // a correction, not what to test
    "Верни как было",
    "Revert that",
    "Undo it",
    "You edited the wrong file",
    "Wrong test",
    "Wrong!",
    "Fix it, this is wrong",
    "Check it again, that is wrong!",
    "Check the login page, wrong.",
  ])
    assert.deepEqual(found(["Write the tests", text]), signal(text), text);
  // the same request twice is still a repeat
  const twice = "запусти все тесты ещё раз";
  assert.deepEqual(found([twice, twice]), [`medium: User repeated the same request: “${twice}”`]);
});

test("not reported: a long paste, two different requests, or the phrase inside another word", () => {
  const dump = "again ".repeat(80);
  assert.deepEqual(found(["Write the tests", dump]), []);
  assert.deepEqual(found(["Cover the discount on the cart", "Then add a test for an empty cart"]), []);
  assert.deepEqual(found(["Write the tests", "wrongdoing is not what this word means"]), []);
});

/* 0.1.125: "нет" is a correction only as a reply, at the start of the message or of a sentence and before a comma, a
   stop or the end. The owner's Cursor session of 11 Oct 2026 was flagged on its task, "…Нет ограничения на длинну
   строки", and not on its real signal, "где вообще assertions?". */
test("нет as a reply is a correction; нет that says something is missing is not", () => {
  const signal = (text) => [`medium: User frustration signal: “${text}” — the agent misunderstood the task a step earlier`];
  for (const text of ["Нет, не так", "Нет!", "нет", "Ты удалил проверку. Нет, верни её", "Нет."])
    assert.deepEqual(found(["Напиши тесты", text]), signal(text), text);
  for (const text of [
    "Используй playwright mcp, чтобы открыть https://shop.example/ Исследуй элементы страницы. перепиши тесты на поиск. Нет ограничения на длинну строки",
    "В спеке ничего нет.",
    "Если элемента нет, тест должен падать",
    "Нетрудно: добавь ещё один тест",
  ])
    assert.deepEqual(found(["Напиши тесты", text]), [], text);
});

test("a question about what the agent did: где вообще, зачем ты, why did you", () => {
  for (const text of [
    "где вообще assertions?",
    "Зачем ты удалил тест?",
    "А где вообще проверки?",
    "Тесты зелёные. Зачем ты их трогал?",
    "why did you skip the login test?",
  ])
    assert.deepEqual(found(["Write the tests", text]), [`medium: User frustration signal: “${text}” — the agent misunderstood the task a step earlier`], text);
  // the same words inside a task are no question about the agent
  assert.deepEqual(found(["Write the tests", "Проверь, где вообще показывается корзина, и напиши тест"]), []);
});

test("a paste sent twice is still a repeat when it starts with a line break", () => {
  const paste = "\nnpm warn publish npm auto-corrected some errors";
  assert.deepEqual(found(["Publish it", paste, paste]), [`medium: User repeated the same request: “${paste.trim()}”`]);
});
