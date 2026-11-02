# SessionLens CLI: setup and usage

## What it is

`sessionlens-cli` reads the session log of an AI coding agent (Claude Code, Codex or Cursor) and shows how the agent
worked on the tests. You run it with one command in a terminal or in CI, and it needs almost no setup.

For example, it checks these things:

- whether the agent actually ran the tests
- whether the agent deleted or weakened a failing test to get a green run
- whether the agent faked the app inside a test
- whether the agent claimed that the tests passed without running them

The checks are the same as in the SessionLens extension for VS Code and Cursor, because the CLI and the extension share
their analysis code.

The CLI has these limits:

- It doesn't run the agent or the tests. It only reads a finished log.
- It doesn't use the network, so the log and the code in it stay on your machine.
- It doesn't run a review with a language model. Those checks exist only in the extension.

## Installation

You only need Node.js 22 or newer, because the package has no dependencies and needs no API keys or settings files.
Check your Node version:

```
node -v
```

You can run the CLI in three ways. After you choose one, check the version with `--version`.

| Way | Install | Run | When to use it |
|---|---|---|---|
| Without installing | none | `npx sessionlens-cli --version` | first tries and CI |
| Globally | `npm install -g sessionlens-cli` | `sessionlens --version` | frequent use in a terminal |
| In a project | `npm install -D sessionlens-cli` | `npx sessionlens --version` | one version for the whole team |

The package is called `sessionlens-cli`, and the command inside it is called `sessionlens`. The examples below use
`npx sessionlens-cli`. If you installed the package globally, write `sessionlens` instead.

To see all the options, run:

```
npx sessionlens-cli --help
```

Versions: `--latest` and folder analysis were added in 0.1.136. In older versions, `--latest` fails with the error
`Unknown option '--latest'`. You can check your version with `--version`.

## First run

The first run needs two things, the path to a log and the profile of your project.

1. Find the session log (see [Which log to give it](#which-log-to-give-it)).
2. Choose a profile (see [Profiles](#profiles)).
3. Run the analysis:

```
npx sessionlens-cli analyze agent.jsonl --profile qa-ts
```

Here is an example report. An agent was asked to make a red test suite green, and the app had no Undo button, so the
agent deleted the test that asked for one.

```
SessionLens 0.1.x · qa-ts · agent.jsonl
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

### How to read the verdict

| Verdict | When you get it |
|---|---|
| Red | there is at least one high finding |
| Yellow | there is no high finding, and there is at least one medium finding |
| Green | there are no high or medium findings; low findings don't affect the verdict |

Green only means that the CLI found nothing serious, and it doesn't guarantee that the tests ran. For example, a session
with a single message, "Done.", also gets Green, so always look at `runs` and `edits`.

### The lines at the top of the report

| Line | What it means |
|---|---|
| `reads` | how many times the agent read files |
| `edits` | how many times the agent edited or wrote files |
| `Read:Edit` | how many reads there were for each edit |
| `runs` | how many times the agent ran the tests |
| `edits to green` | how many edits came before the first green run; `—` means there was no green run |
| `Tokens` | the tokens used, when the log records them |
| `Specification` | how many requirements the CLI read from `--spec`, `<file>: no requirements found` if it read none, or `not provided` |
| `Lint` | what the profile's linter found in the session's code |
| `Subagents` | how many subagent files the CLI read with the session |
| `Calibration` | how many verdicts the CLI used and what they changed |

### The lines with findings

Each line has four fields, which are the severity, the name of the check, the step number in the session, and the text.
The report sorts findings by severity, and findings of the same severity stay in session order.

The report can end with two more lines:

- `Context, not counted in CI` lists the checks that `--ci` set aside.
- `Hidden by calibration` lists the findings that calibration hid, with the reason.

## Which log to give it

Give the CLI one `.jsonl` file for each session. Where you find that file depends on the agent.

| Agent | Where the log is | Notes |
|---|---|---|
| Claude Code | `~/.claude/projects/<project>/<id>.jsonl` | subagents are in the `<id>/subagents/` folder next to it, and the CLI reads them automatically |
| Codex | `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl` | the folder is shared by all projects |
| Cursor Agent CLI | the file where you saved the output of `agent -p --output-format stream-json` | the most complete Cursor log, with tool calls and their results |
| Cursor in the editor | `~/.cursor/projects/<project>/agent-transcripts/` | the file has no command output, so test runs have no result |

The name of the project folder comes from the project's full path, with every character except Latin letters and digits
replaced by a hyphen. For `/Users/me/my-app`, the name is `-Users-me-my-app` for Claude Code and `Users-me-my-app` for
Cursor.

### Claude Code subagents

Claude Code stores the steps of subagents, such as Playwright's planner, generator and healer, apart from the session
file. If you copy a log, as a CI artifact for example, copy the `<id>/subagents/` folder too. Without that folder the
review misses those steps, and the CLI says so on stderr.

### `--latest`: no need to find the file (0.1.136 and newer)

Run the command from the project's folder, and the CLI takes the newest session of Claude Code, Codex or Cursor that
worked in that folder:

```
cd ~/my-app
npx sessionlens-cli analyze --latest --profile qa-ts
```

The CLI names the file it took on stderr and in the report. Keep these points in mind:

- Run the command from the folder where the agent worked, because the CLI doesn't find the session from a subfolder.
- The newest session is the one whose file changed last. If an agent is still working, you get a review of an unfinished
  session.
- For Codex, the CLI looks only at the 200 newest sessions across all projects. Give the path for an older session.
- You usually don't need `--latest` in CI, because you choose where to save the log there.

## Profiles

The profile is required, because it decides which checks and which linter the CLI uses. Choose it by the language or tool
of your tests. There's no settings file, so you give the profile in every command.

| Profile | For | Files it reads as code |
|---|---|---|
| `qa-ts` | Playwright and other tests in TypeScript or JavaScript | `.ts .tsx .js .mjs .cjs` |
| `qa-cypress` | Cypress | `.ts .tsx .js .mjs .cjs` |
| `qa-detox` | Detox (React Native) | `.ts .tsx .js .mjs .cjs` |
| `qa-python` | pytest and other tests in Python | `.py` |
| `qa-java` | tests in Java and Kotlin | `.java .kt` |
| `qa-c#` | tests in C# | `.cs` |
| `qa-api` | API tests in any language, Postman, Gherkin | `.py .java .kt .ts .tsx .js .mjs .cjs .cs .go .feature`, Postman files |
| `qa-mobile` | Appium in any language | `.py .java .kt .ts .tsx .js .mjs .cjs .cs` |
| `qa-robot` | Robot Framework | `.robot .resource` |
| `qa-generic` | everything else | any |

If your project uses several languages, choose the profile for the language of the tests, not the language of the app.
`qa-generic` has few checks, so use it only when no other profile fits.

## Options

Only `--profile` is required, and you can add the other options when you need them.

| Option | What it does |
|---|---|
| `--profile <name>` | the project's profile; required |
| `--latest` | the newest session in this folder, instead of a path to a log (0.1.136 and newer) |
| `--spec <file>` | the specification the tests should cover |
| `--rules <file>` | a `rules.json` from the Rules tab of the extension |
| `--verdicts <path>` | reviewers' verdicts, as a file or a folder; you can give it several times |
| `--ci` | for a session that ran in CI |
| `--fail-on <level>` | `none` (the default), `red` or `yellow`; exit code 1 when the session is that colour or worse |
| `--json` | the report as JSON instead of text |
| `--md` | the report as Markdown instead of text |
| `--json-file <file>` | also write the JSON to a file |
| `--no-color` | no colours in the text |
| `-h`, `--help` | the help text |
| `--version` | the version |

### `--spec`: checking that requirements are covered

With a specification, SessionLens can see which requirements have a test. Without one, the report has a `no_spec`
finding, if the session had code.

```
npx sessionlens-cli analyze agent.jsonl --profile qa-ts --spec spec.md
```

The simplest format gives each requirement an ID, such as `R1`, or a key from your test management tool, such as `NAV-01`
or `REQ-12`:

```
# Todo

## Requirements
- R1 A todo can be added
- R2 A todo can be deleted
```

The `Specification` line of the report says how many requirements the CLI recognized. If the number is not what you
expected, check the format of the file. `--spec` works with one session, so you can't give it with a folder.

### `--rules`: your team's rules

On the Rules tab of the extension, you can change the severity of a check or switch it off. Export the file, keep it in
your repository, and give it to the CLI:

```
npx sessionlens-cli analyze agent.jsonl --profile qa-ts --rules .sessionlens/rules.json
```

If a rule names an unknown check, the CLI skips the rule and says so on stderr. A file in another format gives exit code 2.

### `--ci`: a session with nobody watching

In CI, nobody can approve the agent's plan or give it a specification while it works. So with `--ci`, the
`stop_markers_missing` check becomes context and doesn't affect the verdict. Without `--spec`, `no_spec` becomes context
too. With `--spec`, `no_spec` counts again, and it then means that the file has no requirements.

You don't need `--ci` on a developer's machine, because these findings say something about the agent's work there.

### `--fail-on`: when to stop the build

By default, the CLI exits with code 0 whatever the verdict, so it doesn't block your pipeline.

| Value | Exit code 1 when the verdict is |
|---|---|
| `none` | never |
| `red` | Red |
| `yellow` | Red or Yellow |

The CLI uses the verdict after `--ci` and calibration.

### Output formats

- Text is the default. It has colours only in a terminal, and `--no-color` or the `NO_COLOR` environment variable turns
  them off.
- `--md` gives Markdown for a CI summary, such as `$GITHUB_STEP_SUMMARY`.
- `--json` gives JSON with the schema `sessionlens/finding@1`, the same file the extension exports.
- `--json-file <file>` writes the JSON to a file, whatever the output format, and creates the folders it needs. So one run
  can give both a summary and a file.

You can't give `--json` and `--md` together. The CLI's own messages go to stderr, so you can safely redirect the report on
stdout to a file.

## A folder of sessions (0.1.136 and newer)

If you give a folder instead of a log, the CLI reviews every `.jsonl` file in it and in its subfolders. You can use this
to see a whole project at once and find the most common findings.

```
$ npx sessionlens-cli analyze ~/.claude/projects/-Users-me-my-app --profile qa-ts
12 sessions: 8 red, 0 yellow, 4 green

green   0 high, 0 medium, 0 low     a1b2c3.jsonl
red     2 high, 0 medium, 0 low     d4e5f6.jsonl
…
Checks, by the sessions they spoke in:
    5  fix_after_fail_without_triage
    4  test_deleted
```

The folder mode works like this:

- The report has one line for each session, the totals, and the number of sessions in which each check spoke.
- The CLI skips the `subagents`, `compaction` and `node_modules` folders. It reads a subagent's file with its session, so
  that file doesn't count as a separate session.
- `--md` gives a table. `--json` and `--json-file` give a file with the schema `sessionlens/summary@1`, which holds the
  full review of each session.
- With `--fail-on`, one session of that colour is enough for exit code 1.
- A log that the CLI can't read goes on a list of skipped logs. If it can't read any of them, the exit code is 2.
- One profile applies to all the sessions, so don't mix projects in different languages in one folder.
- `--spec` doesn't work with a folder, because the sessions have different tasks.

## Calibration with reviewers' verdicts

Calibration switches off or lowers the checks that your reviewers often reject. The rules are the same as in the
extension, so the same verdicts give the same result there and in CI.

### How to set it up

1. Keep the session log, as a CI artifact for example.
2. Open the log in the extension with **Choose file**.
3. Mark each finding as right or wrong.
4. On the Calibration tab, click **Export verdicts.json**.
5. Save the file in your repository, one file for each reviewer, e.g., `.sessionlens/verdicts/anna.json` and
   `.sessionlens/verdicts/ivan.json`.
6. Give the folder to the CLI:

```
npx sessionlens-cli analyze agent.jsonl --profile qa-ts --ci --verdicts .sessionlens/verdicts/
```

You can give `--verdicts` several times, and a JSON report with verdicts also works. In a folder, the CLI reads only the
`.json` files at the top level.

### How the CLI decides

The CLI computes precision separately for each pair of check and source. Precision is the share of "right" verdicts among
all verdicts.

| Verdicts | Precision | Result |
|---|---|---|
| fewer than 10 | any | nothing changes; a check on trial stays low |
| 10 or more | under 30% | the check is off |
| 10 or more | 30% to under 50% | the findings are lowered to low |
| 10 or more | 50% or more | the check speaks at its own severity, and so does a check on trial |

Keep these points in mind:

- The CLI never calibrates a missing specification, uncovered requirements, hardcoded secrets or the model's findings.
- The same finding in two files counts once, and the first verdict wins. The CLI reads the files in a folder in
  alphabetical order.
- A check that you switched on by hand on the Rules tab stays on, if you exported `rules.json` from 0.1.135 or newer and
  give it with `--rules`.
- Verdicts can also switch off important checks, such as `test_deleted`. Mark findings with care, and check in the report
  what changed.

### What the report shows

```
Calibration: 37 verdicts from 2 files, off: magic_number, demoted: raw_locator
…
Hidden by calibration: magic_number (precision 20% over 15 verdicts)
```

With `--fail-on`, the CLI uses the verdict after calibration.

## Setting it up in CI

In CI you need three steps, which run the agent and save its log, review the log, and keep the log as an artifact. Here is
an example for GitHub Actions with a Cursor agent.

### GitHub Actions, step by step

1. Create an API key in the Cursor dashboard. Each run uses your Cursor plan.
2. Add the key to your repository's secrets as `CURSOR_API_KEY`.
3. Copy the ready example [`cursor-agent.yml`](../cli/examples/cursor-agent.yml) to `.github/workflows/`.
4. Replace the project setup steps and the `qa-ts` profile with your own.
5. Start the workflow by hand on the Actions tab, and enter the agent's task.
6. Open the run's summary to see the SessionLens report. The log and the JSON are in the artifacts.

These are the main steps of the example:

```yaml
- name: The agent writes the tests
  env:
    CURSOR_API_KEY: ${{ secrets.CURSOR_API_KEY }}
    PROMPT: ${{ inputs.prompt }}
  run: agent -p "$PROMPT" --force --output-format stream-json > "$RUNNER_TEMP/agent.jsonl"

- name: SessionLens reviews the session
  if: always()
  run: npx -y sessionlens-cli@0.1 analyze "$RUNNER_TEMP/agent.jsonl" --profile qa-ts --ci --md --json-file "$RUNNER_TEMP/review.json" >> "$GITHUB_STEP_SUMMARY"

- name: Keep the log and the review
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: agent-session
    path: |
      ${{ runner.temp }}/agent.jsonl
      ${{ runner.temp }}/review.json
```

The example is written this way for these reasons:

- Only the agent's step has the key, because SessionLens doesn't need one.
- The task reaches the shell through `env`, so it isn't pasted into the script.
- The log is outside the working copy, so the agent doesn't read it while it's being written.
- `if: always()` keeps the review and the log even when the agent fails.
- `sessionlens-cli@0.1` takes the latest 0.1.x release. For fully repeatable runs, give an exact version.
- `npx` downloads the package from npm, and the analysis itself doesn't use the network.

With another agent, only the first step changes, so save that agent's log and give its path to the CLI. With Claude Code,
copy the subagents folder too.

### A staged rollout

Don't turn on blocking right away. First, make sure that you can trust the reports on your own sessions.

1. Reading: run without `--fail-on` and read the reports.
2. Marking: open the logs from the artifacts in the extension and mark the findings.
3. Calibration: add `--verdicts .sessionlens/verdicts/` when you have enough verdicts.
4. Blocking: add `--fail-on red`.

Exit code 2 means that the CLI itself failed, and it says nothing about the session. In GitHub Actions, that step also
turns red, even without `--fail-on`.

## Exit codes and errors

The CLI has three exit codes, and it always writes the reason for an error to stderr.

| Code | When |
|---|---|
| 0 | the report is written; without `--fail-on`, this is the code for any verdict |
| 1 | the verdict matched `--fail-on` |
| 2 | the CLI could not do its work |

### Error messages

| Message | Cause | What to do |
|---|---|---|
| `--profile is required` | no profile was given | add `--profile <name>` |
| `unknown profile` | no such profile exists | take a name from the list in the message |
| `cannot read <file>: no such file` | the path is wrong | check the path and the current folder |
| `is not a session log` | the file is plain text, such as an error message saved in place of the log (0.1.137 and newer) | check that the agent didn't fail and that the log was written |
| `no steps read; is it a session log` | the file is empty, or it holds JSON in an unknown format | check that the agent didn't fail and that the log was written |
| `holds N conversations` | the file holds several sessions | give one file for each session |
| `no session of Claude Code, Codex or Cursor found` | `--latest` found no session for this folder | run it from the folder where the agent worked, or give the path |
| `Unknown option '--latest'` | the version is older than 0.1.136 | update the package, or give the path to the log |
| `a log or --latest: one of them` | both a path and `--latest` were given | keep one of them |
| `--spec is for one session` | `--spec` was given with a folder | remove `--spec`, or give one log |
| `no .jsonl logs in this folder` | the folder has no logs | check the path |
| `is not a rules.json` | the rules file is in another format | export it again from the Rules tab |
| `is not a verdicts.json` | the verdicts file is in another format | export it again from the Calibration tab |
| `--json and --md: one output at a time` | both formats were given | keep one, and use `--json-file` for the JSON |
| `--fail-on is none, red or yellow` | the value is wrong | choose one of the three |
| `lint engine did not load` | the profile's linter didn't load | check your Node version and reinstall the package |

### Warnings

These messages don't change the exit code, but the report is incomplete:

- `the session started subagents and their files are not next to it` means that the subagents folder isn't next to the
  log, so copy it there.
- `no tool calls in this log` means that the log has only messages, for example because the agent stopped early. The
  report says so too, and the JSON report has `noToolCalls: true` (0.1.137 and newer).
- `its tool calls are in a format SessionLens does not read` means that the review is based only on the messages. Check
  that the log was written in the right format, such as `stream-json` for Cursor.

### What the CLI doesn't stop

A log with only messages can still get Green and exit code 0, even with `--fail-on`, because the verdict comes from the
findings and such a log has none. So in CI, also check that `metrics.runs` and `metrics.edits` in the JSON report are above
zero.
