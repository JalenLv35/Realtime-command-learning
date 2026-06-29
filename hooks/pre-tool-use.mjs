import fs from "node:fs";
import path from "node:path";
import { explainCommand } from "../src/lib/explain-command.mjs";
import { writeLearningRecord } from "../src/lib/learning-log.mjs";

const payload = await readJsonFromStdin();
const command = extractCommand(payload);

if (!command) {
  process.exit(0);
}

// Check config — exit silently if plugin is disabled
const config = readConfig();
if (!config.enabled) {
  process.exit(0);
}

const record = explainCommand(command, {
  source: "hook",
  cwd: payload.cwd
});

writeLearningRecord(record);

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(path.resolve(".command-learning/config.json"), "utf8"));
  } catch {
    return { enabled: true, mode: "beginner" };
  }
}

function extractCommand(input) {
  return input?.tool_input?.command
    ?? input?.toolInput?.command
    ?? input?.input?.command
    ?? input?.command
    ?? "";
}

async function readJsonFromStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}
