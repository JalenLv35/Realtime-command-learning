import { explainCommand } from "../src/lib/explain-command.mjs";
import { writeLearningRecord } from "../src/lib/learning-log.mjs";

const payload = await readJsonFromStdin();
const command = extractCommand(payload);

if (!command) {
  process.exit(0);
}

const record = explainCommand(command, {
  source: "hook",
  cwd: payload.cwd
});

writeLearningRecord(record);

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
