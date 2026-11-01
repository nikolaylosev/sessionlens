// @ts-check
/* The subagents of a Claude Code session file <dir>/<id>.jsonl: <dir>/<id>/subagents/agent-<agentId>.jsonl, each with
   agent-<agentId>.meta.json ({ agentType, description, … }). [] when there is no such folder; a file that cannot be read
   is left out. Lens.joinSubagents puts them into the session's text. Node only: the host and the CLI read the files,
   the page gets the joined text. */
const fs = require("fs");
const path = require("path");

function claudeSubagents(file) {
  if (!/\.jsonl$/i.test(file)) return [];
  const dir = path.join(file.replace(/\.jsonl$/i, ""), "subagents");
  let names;
  try {
    names = fs.readdirSync(dir).filter((n) => /^agent-[\w-]+\.jsonl$/.test(n));
  } catch {
    return [];
  }
  const out = [];
  for (const n of names.sort()) {
    const agentId = n.replace(/^agent-|\.jsonl$/g, "");
    let meta = {};
    try {
      meta = JSON.parse(fs.readFileSync(path.join(dir, `agent-${agentId}.meta.json`), "utf8")) || {};
    } catch {
      /* no meta: the agent's type stays unknown */
    }
    try {
      out.push({ agentId, agentType: typeof meta.agentType === "string" ? meta.agentType : "", text: fs.readFileSync(path.join(dir, n), "utf8") });
    } catch {
      /* unreadable: left out */
    }
  }
  return out;
}

module.exports = { claudeSubagents };
