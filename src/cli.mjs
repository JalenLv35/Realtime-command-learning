import { explainCommand } from "./lib/explain-command.mjs";
import { writeLearningRecord } from "./lib/learning-log.mjs";

const command = process.argv.slice(2).join(" ").trim();

if (!command) {
  console.error('Usage: node src/cli.mjs "curl -s https://example.com"');
  process.exit(1);
}

const record = explainCommand(command, {
  source: "manual"
});

writeLearningRecord(record);

console.log(`Wrote .command-learning/learning-log.md`);
