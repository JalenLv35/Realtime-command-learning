import fs from "node:fs";
import path from "node:path";

const CONFIG_PATH = path.resolve(".command-learning/config.json");

const MODE_LABELS = {
  beginner: "新手",
  intermediate: "进阶",
  expert: "精通"
};

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  } catch {
    return { enabled: true, mode: "beginner" };
  }
}

const config = readConfig();
const modeLabel = MODE_LABELS[config.mode] ?? config.mode;

if (config.enabled) {
  process.stdout.write(`CL: ${modeLabel}`);
} else {
  process.stdout.write("CL: 关闭");
}
