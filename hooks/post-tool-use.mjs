import fs from "node:fs";
import path from "node:path";

const payload = await readJsonFromStdin();
const command = extractCommand(payload);

if (!command) {
  process.exit(0);
}

const response = payload.tool_response ?? payload.toolResponse ?? {};
const exitCode = response.exit_code ?? response.exitCode ?? null;
const output = response.output ?? response.stdout ?? "";

const dir = path.resolve(".command-learning");
fs.mkdirSync(dir, { recursive: true });

fs.appendFileSync(
  path.join(dir, "events.jsonl"),
  `${JSON.stringify({
    type: "command_finished",
    command,
    exitCode,
    outputPreview: output.slice(0, 200),
    ts: new Date().toISOString()
  })}\n`,
  "utf8"
);

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
