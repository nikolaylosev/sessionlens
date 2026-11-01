# SessionLens roadmap

This is how we see SessionLens developing, as of version 0.1.135 (November 2026). There are no dates, and the order
can change with feedback. To suggest something, please
[open an issue](https://github.com/nikolaylosev/sessionlens/issues).

## Today

SessionLens reviews the transcript of a Claude Code, Codex or Cursor Agent session and shows what the agent actually
did, e.g. tests that never ran, assertions weakened after a failure, or deleted tests. You give a verdict on each
finding, calibration quiets the checks that are often wrong on your sessions, and confirmed findings become rules for
`CLAUDE.md`, `AGENTS.md` or Cursor's `.cursor/rules/sessionlens.mdc`. It runs in VS Code, Cursor and VSCodium, and on
the command line and in CI. Everything runs locally, and it is all still experimental.

Cursor support came in 0.1.121: Cursor Agent transcripts from the editor and the CLI (with the output of the agent's
commands, read from Cursor's own databases on your machine), the CLI's `stream-json` log, a rules file for Cursor, and
your Cursor subscription as a model for the semantic review. 0.1.122 shows a Cursor Agent session's files relative to
its workspace, and gives fewer false findings: code inside a Python docstring, a command that only lists the tests,
and comments in the test data check no longer count. It also reads a file moved by a Codex patch, and a weakened
assertion's finding shows what changed. 0.1.123 finds weak assertions in C#, Go, REST Assured and Karate files it
skipped before.

0.1.124 makes the Sessions list easier to work with once there are many sessions. It groups them by date by default,
or by profile, verdict, agent, or groups you make yourself (a button, a menu item, or drag and drop). It filters them
by name, task, profile or group, and has quick filters for red sessions and for sessions with findings you have not
judged yet. Paths in your home folder start with `~`, so a review or a PR report no longer shows your user name, and
a finding that quotes a long line cuts it at a word.

0.1.125 to 0.1.127 read more of what an agent does: the steps of Claude Code's subagents and of Playwright's test
agents (planner, generator, healer), a file written by a shell command, a check made in a browser instead of in a
test, and assertions inside a page object. 0.1.129 adds Ruff to the Python engine and the Python checks to API tests
on pytest.

0.1.130 can record a Cursor agent's runs with a hook, so a Cursor session has the output of its commands and the
files before and after each edit. A session shows its tokens, its cost with your own prices, and the share of a Codex
subscription's limits it used. A specification can use the IDs of a test management tool (`NAV-01`, `CIP-T123`), and
the agent's own test plan or document of test cases can become the specification with one click. New checks start
on trial, as low findings, until reviewers have judged them.

0.1.132 adds a check for tests that check a fake instead of the app, an agent's way out when the app lacks what a test
asks for, found by running agents in CI ourselves. It also reads test runs of the Cursor CLI that go on past its
timeout.

0.1.133 brings the same checks to the terminal and to CI with the npm package `sessionlens-cli`: text, Markdown for a CI
job's summary or JSON, an optional exit code to fail a build, and a ready example for GitHub Actions. 0.1.135 lets your
reviewers' verdicts calibrate the checks there too.

SessionLens looks at the agent's session, while pull request review tools look at the final diff. We plan new checks
around process mistakes that only the session shows.

## Now

- Try the command line tool on real CI runs, test the Cursor hook on Windows, and ship fixes as patch releases.
- Tune checks based on [false finding reports](https://github.com/nikolaylosev/sessionlens/issues/new?template=false-finding.yml).

## Next: starter rules and a Cursor plugin

- Starter rules for each profile on the Calibration tab: rules for `CLAUDE.md`, `AGENTS.md` or Cursor before you have
  confirmed findings of your own, built from the same rule book the checks use, so a rule and its check never drift
  apart.
- A Cursor plugin: the rules and a skill for Cursor's Agent, and a hook that runs the command line tool when the agent
  finishes and gives its findings back to the agent.

## Later

- More of the command line tool: SARIF output, a standalone HTML report, an optional chat notification, and ready
  examples for agents other than Cursor's.
- Cursor on Windows and Linux (tested on macOS only so far), and Cloud Agent runs once they leave a file on your
  machine.
- Precision per model on the Calibration tab, and calibration thresholds per source, once there are enough verdicts.
- New profiles for iOS (Swift, XCTest) and Flutter (Dart).
- A JetBrains plugin built on the same analysis code.

## Under consideration

- A verdict key that survives rewording of a finding.
- Calibration shared by a team, with the reviewer and date of each verdict, once several reviewers give verdicts.

## Not planned

- Translating the interface. It stays in English, because verdicts are tied to the text of a finding.
- Reviewing diffs or pull requests in general.
