import fs from "node:fs";
import path from "node:path";

export function writeLearningRecord(record, options = {}) {
  const dir = path.resolve(options.dir ?? ".command-learning");
  fs.mkdirSync(dir, { recursive: true });

  fs.appendFileSync(
    path.join(dir, "events.jsonl"),
    `${JSON.stringify({
      type: "command_explained",
      id: record.id,
      source: record.source,
      command: record.command,
      cwd: record.cwd,
      createdAt: record.createdAt,
      explanation: record.explanation,
      risks: record.risks
    })}\n`,
    "utf8"
  );

  fs.appendFileSync(path.join(dir, "learning-log.md"), renderMarkdown(record), "utf8");
}

function renderMarkdown(record) {
  const time = new Date(record.createdAt).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });

  const firstToken = record.command.match(/\S+/)?.[0] ?? "command";

  const lines = [
    `## ${time} \`${firstToken}\``,
    "",
    "```bash",
    record.command,
    "```",
    "",
    "**通用解释**",
    ""
  ];

  for (const item of record.explanation) {
    lines.push(`- \`${item.label}\`: ${item.text}`);
  }

  if (!record.explanation.length) {
    lines.push("- 暂未识别，可补充规则。");
  }

  if (record.originalCommandWasRedacted) {
    lines.push("", "**隐私处理**", "", "- 这条命令包含疑似敏感信息，已在学习文档中脱敏。");
  }

  if (record.risks.length) {
    lines.push("", "**风险提示**", "");
    for (const risk of record.risks) {
      const levelLabel = risk.level === "high" ? "高风险" : "中风险";
      lines.push(`- **[${levelLabel}]** ${risk.text}`);
    }
  }

  lines.push("", "---", "");
  return `${lines.join("\n")}\n`;
}
