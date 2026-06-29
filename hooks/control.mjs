import fs from "node:fs";
import path from "node:path";

const CONFIG_PATH = path.resolve(".command-learning/config.json");

const MODE_ALIASES = {
  "beginner": "beginner", "新手": "beginner",
  "intermediate": "intermediate", "进阶": "intermediate",
  "expert": "expert", "精通": "expert"
};

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

function writeConfig(config) {
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
}

function printStatus(config) {
  const statusIcon = config.enabled ? "✅ 开启" : "⛔ 关闭";
  const modeLabel = MODE_LABELS[config.mode] ?? config.mode;
  console.log(`Command Learning 状态：${statusIcon}  模式：${modeLabel}`);
  console.log("");
  console.log("可用命令：");
  console.log("  /command-learning on          开启记录");
  console.log("  /command-learning off         关闭记录");
  console.log("  /command-learning mode 新手   显示所有命令");
  console.log("  /command-learning mode 进阶   过滤基础命令");
  console.log("  /command-learning mode 精通   只看复杂/风险命令");
}

const args = process.argv.slice(2);
const action = args[0]?.toLowerCase();
const config = readConfig();

if (!action || action === "status") {
  printStatus(config);
  process.exit(0);
}

if (action === "on") {
  config.enabled = true;
  writeConfig(config);
  console.log(`✅ Command Learning 已开启（模式：${MODE_LABELS[config.mode]}）`);
  process.exit(0);
}

if (action === "off") {
  config.enabled = false;
  writeConfig(config);
  console.log("⛔ Command Learning 已关闭，不再记录 Bash 命令。");
  process.exit(0);
}

if (action === "mode") {
  const modeInput = args[1];
  const resolved = MODE_ALIASES[modeInput];
  if (!resolved) {
    console.error(`未知模式：${modeInput}。可选：新手 / 进阶 / 精通`);
    process.exit(1);
  }
  config.mode = resolved;
  writeConfig(config);
  console.log(`✅ 模式已切换为：${MODE_LABELS[resolved]}`);
  process.exit(0);
}

console.error(`未知命令：${action}`);
process.exit(1);
