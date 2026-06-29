import { parseCommand } from "./parse-command.mjs";
import { redactCommand } from "./redact-command.mjs";
import { detectRisks } from "./risk-detector.mjs";
import { commandRules, genericSymbols } from "../rules/commands.mjs";

export function explainCommand(command, options = {}) {
  const redactedCommand = redactCommand(command);
  const parsed = parseCommand(redactedCommand);
  const firstCommand = parsed.tokens.find((token) => !token.isAssignment && !token.isOperator)?.value ?? "";
  const rule = commandRules[firstCommand];
  const items = [];

  if (rule) {
    items.push({
      label: firstCommand,
      text: rule.summary
    });
  } else if (firstCommand) {
    items.push({
      label: firstCommand,
      text: "暂未收录这个命令的本地规则。后续可以补充规则或交给模型解释。"
    });
  }

  for (let i = 0; i < parsed.tokens.length; i += 1) {
    const token = parsed.tokens[i];
    const value = token.value;

    if (genericSymbols[value]) {
      items.push({ label: value, text: genericSymbols[value] });
      continue;
    }

    if (rule?.subcommands?.[value]) {
      items.push({ label: `${firstCommand} ${value}`, text: rule.subcommands[value] });
      continue;
    }

    if (rule?.flags?.[value]) {
      const next = parsed.tokens[i + 1]?.value;
      const label = needsValue(value, firstCommand) && next ? `${value} ${next}` : value;
      items.push({ label, text: rule.flags[value] });
      continue;
    }

    if (token.kind === "localhost") {
      items.push({
        label: value,
        text: "本机地址，常用于访问当前机器上运行的服务。"
      });
      continue;
    }

    if (token.kind === "url") {
      items.push({
        label: value,
        text: "URL 地址，命令会和这个网络位置交互。路径部分的业务含义取决于服务实现。"
      });
    }
  }

  return {
    id: options.id ?? `cmd_${Date.now()}`,
    source: options.source ?? "manual",
    command: redactedCommand,
    originalCommandWasRedacted: redactedCommand !== command,
    cwd: options.cwd ?? process.cwd(),
    createdAt: new Date().toISOString(),
    explanation: dedupeItems(items),
    risks: detectRisks(redactedCommand)
  };
}

function needsValue(flag, commandName) {
  return commandName === "curl" && ["-X", "-H", "-d", "-o"].includes(flag);
}

function dedupeItems(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (seen.has(item.label)) return false;
    seen.add(item.label);
    return true;
  });
}
