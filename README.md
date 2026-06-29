# Realtime Command Learning

把 agent 执行的 Bash 命令实时沉淀成学习文档。

当前是一个初步可用版本：你可以手动解释一条命令，也可以用 hook 入口接收 agent 的 Bash 命令。项目会写入事件日志和 Markdown 学习文档，并提供一个本地 viewer 查看最近事件。

## 快速开始

```bash
npm run demo
```

生成文件：

```txt
.command-learning/events.jsonl
.command-learning/learning-log.md
```

启动本地查看页：

```bash
npm run serve
```

打开：

```txt
http://127.0.0.1:48731
```

## 手动解释命令

```bash
npm run explain -- "curl -s -X POST http://127.0.0.1:4317/api/control/start"
```

## Hook 测试

```bash
npm run hook:test
```

## 当前功能

- 解释常见命令和参数：`curl`、`git`、`ls`、`cat`、`rg`、`npm`、`node`、`python`、`docker`。
- 识别 URL、本机地址、管道、重定向、`&&`、`||`。
- 对 `Authorization`、`Cookie`、`token`、`password`、`api_key` 做基础脱敏。
- 对 `rm -rf`、`sudo`、`curl | bash` 做风险提示。
- 写入 `.command-learning/events.jsonl` 和 `.command-learning/learning-log.md`。
- 提供本地只读 viewer。

## 项目结构

```txt
src/
  cli.mjs
  server.mjs
  lib/
    explain-command.mjs
    learning-log.mjs
    parse-command.mjs
    redact-command.mjs
    risk-detector.mjs
  rules/
    commands.mjs
hooks/
  pre-tool-use.mjs
public/
  index.html
  app.js
  style.css
docs/
  implementation-and-market-research.md
  next-steps.md
```

## 设计边界

- 解释命令层面的确定含义。
- 不猜业务接口语义。
- 默认脱敏后再写日志。
- 默认不阻塞 agent 执行。
