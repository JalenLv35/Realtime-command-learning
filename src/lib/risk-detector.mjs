export function detectRisks(command) {
  const risks = [];

  if (/curl\b[\s\S]*\|[\s\S]*(bash|sh)\b/.test(command)) {
    risks.push({
      level: "high",
      text: "这条命令可能把网络下载的内容直接交给 shell 执行。执行前应确认来源可信。"
    });
  }

  if (/\brm\s+(-[^\s]*r[^\s]*f|-[^\s]*f[^\s]*r)\b/.test(command)) {
    risks.push({
      level: "high",
      text: "这条命令包含递归强制删除，误用会删除大量文件。"
    });
  }

  if (/\bsudo\b/.test(command)) {
    risks.push({
      level: "medium",
      text: "这条命令使用 sudo，可能以更高权限修改系统或项目文件。"
    });
  }

  return risks;
}
