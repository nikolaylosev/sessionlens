# sessionlens-cli

SessionLens reviews the session log of an AI coding agent (Claude Code, Codex, Cursor) and tells you how the agent
worked on the tests. Did it run them? Did it delete or weaken a failing test to make the suite green? Did it build a
fake of the app for the tests to pass against? Did it claim the tests pass without running them?

This package is the command-line version of the [SessionLens extension](https://github.com/nikolaylosev/sessionlens)
for VS Code and Cursor. It runs the same checks, so you can review a session in a terminal or in CI.

## Run it

```
npx sessionlens-cli analyze <log> --profile <name>
```

You need Node.js 22 or newer. The package has no dependencies, and it does not use the network: the log and the code
in it stay on your machine.

```
$ npx sessionlens-cli analyze agent.jsonl --profile qa-ts
SessionLens 0.1.132 · qa-ts · agent.jsonl
Verdict: Red · profile qa-ts · reads 13, edits 1, Read:Edit 13, runs 2, edits to green 1
3 high, 1 medium, 0 low
Tokens: 177k in (82% from the cache), 2k out.
Specification: not provided
Lint: ESLint: 0 findings in 1 block

high    no_spec                        #24   No specification: impossible to tell which checks are requirements and which are the agent's guesses
high    fix_after_fail_without_triage  #24   Edited tests/undo.spec.ts right after a failure (seq 13) with no triage: product bug / test bug / spec defect
high    test_deleted                   #24   tests/undo.spec.ts: 1 test deleted: a deleted todo can be restored with Undo — right after a failing run (seq 13)
medium  stop_markers_missing           #24   Code written without a plan
```

Here an agent was asked to make a red suite green. The app had no Undo button, so the agent deleted the test that
asked for one. The verdict is Red when there is a high finding, Yellow when there is a medium one, and Green otherwise.

## Which log to give it

- **Claude Code:** the session's `.jsonl` file in `~/.claude/projects/<project>/`.
- **Codex:** the `rollout-*.jsonl` file in `~/.codex/sessions/`.
- **Cursor Agent CLI:** the output of `agent -p --output-format stream-json`, saved to a file.
- **Cursor in the editor:** the `.jsonl` file in `~/.cursor/projects/<workspace>/agent-transcripts/`. This file has
  no command output, so test runs have no result. The editor extension reads the output from Cursor's own databases;
  the CLI does not.

Give it one session per file.

## Options

| Option | What it does |
|---|---|
| `--profile <name>` | Required. The kind of project: `qa-ts` (Playwright), `qa-cypress`, `qa-detox`, `qa-python`, `qa-java`, `qa-c#`, `qa-api`, `qa-mobile`, `qa-robot`, `qa-generic`. It picks the checks and the lint engine. |
| `--spec <file>` | The specification the tests should cover. With it, SessionLens checks which requirements have a test. |
| `--rules <file>` | A `rules.json` exported from the Rules tab of the extension: your team's severities and switched-off checks. |
| `--ci` | For a session that ran in CI. Nobody was there to approve the agent's plan, so `stop_markers_missing` (code written without a plan) is listed as context and does not count in the verdict. Without `--spec`, nobody could give a specification either, so `no_spec` is context too. |
| `--fail-on <level>` | `none` (the default), `red` or `yellow`. Exit with code 1 when the session is that colour or worse. |
| `--json` | Print the review as JSON (schema `sessionlens/finding@1`, the same file the extension exports). |
| `--md` | Print the review as Markdown, for a CI job's summary. |
| `--no-color` | No colours in the text. The `NO_COLOR` environment variable does the same. |

## Exit codes

| Code | When |
|---|---|
| 0 | The review is written. This is the default whatever the verdict, so that adding SessionLens to a pipeline never blocks it by itself. |
| 1 | `--fail-on` matched the verdict. |
| 2 | SessionLens could not do its work: a file it cannot read, no profile or an unknown one, a log with no steps, a lint engine that did not load. The reason is on stderr. |

## In GitHub Actions

Run the agent, save its log, then review it:

```yaml
- name: Agent writes the tests
  run: agent -p "$PROMPT" --output-format stream-json > "$RUNNER_TEMP/agent.jsonl"
- name: SessionLens
  run: npx sessionlens-cli analyze "$RUNNER_TEMP/agent.jsonl" --profile qa-ts --ci --md >> "$GITHUB_STEP_SUMMARY"
- uses: actions/upload-artifact@v4
  with:
    name: agent-log
    path: ${{ runner.temp }}/agent.jsonl
```

Start without `--fail-on`, read the reports for a while, then add `--fail-on red` when you trust them. Keep the log as
an artifact: you can open it in the extension later and mark each finding as right or wrong.

## What it does not do yet

- No verdicts and no calibration: every check speaks at its default severity. A new check "on trial" is low.
- No model review: the checks that ask a language model run only in the extension.

## License

MIT. The package includes ESLint with the Playwright and Cypress plugins, tree-sitter and Ruff; their notices are in
`THIRD-PARTY-NOTICES.md`.
