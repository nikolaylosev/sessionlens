// @ts-check
/* Ruff, the Python linter, as the second half of the Python engine (0.1.129): qa-python, and qa-api's .py files.
   tree-sitter (lint-python.js) keeps the rules a parse tree answers and Ruff has none of: a test with no assertion,
   assertEqual's arguments the wrong way round, `except: pass`. Ruff adds what its own rules already find well in a
   test, each under a check SessionLens has (lint.js's PYTHON_RULE_MAP): a comparison with no assert (B015), a
   pytest.raises() that takes any exception (PT011, B017), `assert a and b` (PT018), `except Exception:` and a bare
   `except:` that also catch the AssertionError of the test (BLE001, E722), breakpoint() and print() (T100, T201, T203),
   a second test with the same name, which hides the first (F811: only for a test_… name, not an import or a helper).
   Left out on purpose: PLR2004 (every `== 200` of an API test), S105/S106 (a test user's password, which no profile
   counts as a secret), PT015/B011 (`assert False` is a deliberate fail).

   media/vendor-ruff.js is @astral-sh/ruff-wasm-web, wrapped by scripts/vendor-ruff.js; media/ruff.wasm is its
   module. lint-python.js boots this layer with its own boot() and asks it for messages in lint(): if Ruff does not
   load, the engine still runs with tree-sitter alone and its note says so ("tree-sitter", not "tree-sitter and Ruff"). */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else /** @type {any} */ (root).LensLintRuff = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  let ready = false,
    bootError = null,
    booting = null;
  /** @type {Map<string, any>} one Ruff workspace per set of rules */
  const workspaces = new Map();

  // Node: the file itself (a path in a constant, so the type check does not read the vendored code)
  const VENDOR = "./vendor-ruff.js";
  const ruffWasm = () => (typeof RuffWasm !== "undefined" ? /** @type {any} */ (RuffWasm) : typeof require === "function" ? require(VENDOR) : null);

  /* opts.ruffWasmUrl: the webview URI of ruff.wasm (fetched); opts.ruffWasmBytes: its bytes (Node: the tests) */
  function boot(opts) {
    opts = opts || {};
    if (booting) return booting;
    const R = ruffWasm();
    if (!R) {
      bootError = "vendor-ruff.js not loaded";
      return (booting = Promise.resolve());
    }
    if (!opts.ruffWasmUrl && !opts.ruffWasmBytes) {
      bootError = "no ruff.wasm given";
      return (booting = Promise.resolve());
    }
    booting = (opts.ruffWasmBytes ? Promise.resolve(R.initSync({ module: opts.ruffWasmBytes })) : R.init({ module_or_path: opts.ruffWasmUrl }))
      .then(() => {
        ready = true;
      })
      .catch((e) => {
        bootError = String((e && e.message) || e);
      });
    return booting;
  }

  const isReady = () => ready;
  // F811 is any name defined twice: a test is what SessionLens asks about ("Redefinition of unused `test_x` from line 7")
  // and its words say what that means for the test
  const SHADOWED_TEST = /^Redefinition of unused `(test\w*)` from line (\d+)/;
  const say = (d) => {
    const m = d.code === "F811" && SHADOWED_TEST.exec(d.message);
    return m ? `\`${m[1]}\` is defined again: the test of line ${m[2]} is replaced and never runs` : String(d.message);
  };
  // booted, or failed to: either way the engine need not wait for it any longer
  const settled = () => ready || !!bootError;

  /* code → { messages: [{ ruleId: "ruff/B015", message, line }] } for the rules given ("ruff/B015" → B015). Only
     those: a syntax error is no finding (Ruff reports it as "invalid-syntax", and a fragment from a message often has
     one). */
  function lint(code, rules) {
    if (!ready) return { messages: [], error: bootError || "ruff: still loading" };
    const select = rules
      .filter((r) => r.startsWith("ruff/"))
      .map((r) => r.slice(5))
      .sort();
    if (!select.length) return { messages: [] };
    const key = select.join(",");
    try {
      if (!workspaces.has(key)) {
        const R = ruffWasm();
        workspaces.set(key, new R.Workspace({ lint: { select } }, R.PositionEncoding.Utf16));
      }
      const out = workspaces.get(key).check(code);
      return {
        messages: out
          .filter((d) => select.includes(d.code) && (d.code !== "F811" || SHADOWED_TEST.test(d.message)))
          .map((d) => ({ ruleId: "ruff/" + d.code, message: say(d), line: d.start_location.row })),
      };
    } catch (e) {
      return { messages: [], error: `ruff: ${String((e && e.message) || e)}` };
    }
  }

  return { boot, isReady, settled, lint, bootError: () => bootError };
});
