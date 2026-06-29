# Realtime Command Learning

把 agent 执行的 Bash 命令实时沉淀成学习文档。

当 Claude Code（或其他 agent）执行 Bash 命令时，插件在旁边生成一份实时学习记录，解释命令的通用含义、参数作用和风险点。目标是把 agent 的执行过程变成可积累、可复习的教学素材。

## 效果示例

agent 执行 `curl -s -X POST http://127.0.0.1:4317/api/control/start` 后，学习日志自动追加：

```md
## 20:21:30 `curl`

​```bash
curl -s -X POST http://127.0.0.1:4317/api/control/start
​```

**通用解释**

- `curl`: curl 用于向 URL 发起网络请求，也常用于下载内容或调用 HTTP API。
- `-s`: silent 模式，隐藏进度条和非必要输出。
- `-X POST`: 指定 HTTP 请求方法，例如 GET、POST、PUT、DELETE。
- `http://127.0.0.1:4317/...`: 本机地址，常用于访问当前机器上运行的服务。
```

## 快速开始

**要求：** Node.js 18+

### 1. 接入 Claude Code Hook

把以下内容合并到项目的 `.claude/settings.json`，将 `PLUGIN_DIR` 替换为本项目的绝对路径：

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "node PLUGIN_DIR/hooks/pre-tool-use.mjs",
            "timeout": 10
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "node PLUGIN_DIR/hooks/post-tool-use.mjs",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

### 2. 启动实时 Viewer

```bash
npm run serve
```

浏览器打开 `http://127.0.0.1:48731`，页面会通过 SSE 实时推送新命令，无需手动刷新。

### 3. 启动 Claude Code

```bash
claude
```

之后 Claude Code 执行的每一条 Bash 命令都会自动出现在 viewer 里。

---

## 手动使用

不接 Claude Code 也可以手动解释命令：

```bash
# 解释单条命令
npm run explain -- "git diff --stat HEAD~1"

# 运行内置 demo（curl 示例）
npm run demo

# 模拟 PreToolUse hook
npm run hook:test

# 模拟 PostToolUse hook
npm run hook:test-post
```

生成的文件：

```
.command-learning/
  events.jsonl      # 结构化事件流（含解释内容）
  learning-log.md   # 面向人阅读的 Markdown 学习日志
```

---

## 功能

### 命令解释

本地规则库覆盖约 20 个高频命令，500ms 内返回解释，不依赖模型：

| 类别 | 命令 |
|---|---|
| 网络 | `curl`、`wget`、`ssh` |
| 文件 | `ls`、`cat`、`cp`、`mv`、`rm`、`mkdir`、`chmod`、`find` |
| 搜索 | `grep`、`rg` |
| 进程 | `ps`、`kill`、`lsof`、`sudo` |
| Git | `git`（含 20+ 子命令和 flags） |
| Node | `npm`、`npx`、`pnpm`、`yarn`、`node` |
| Python | `python`、`pip` |
| 容器 | `docker`（含 15+ 子命令和 flags） |
| 符号 | `\|`、`>`、`>>`、`&&`、`\|\|`、`2>&1` |

### 隐私脱敏

写入日志前自动脱敏，覆盖：

- `Authorization: Bearer / Basic` token
- `Cookie` header
- `curl -u user:password`
- URL query 参数：`token`、`api_key`、`secret`、`password`
- 环境变量：`GITHUB_TOKEN`、`NPM_TOKEN` 等
- Git remote URL 中的嵌入凭证：`https://user:pass@github.com`

### 风险提示

| 模式 | 级别 |
|---|---|
| `curl ... \| bash` | 高风险 |
| `rm -rf` / `rm -fr` | 高风险 |
| `sudo` | 中风险 |

---

## 项目结构

```
hooks/
  hooks.json            # Claude Code hook 配置模板
  pre-tool-use.mjs      # PreToolUse hook
  post-tool-use.mjs     # PostToolUse hook
src/
  cli.mjs               # 手动解释命令的 CLI 入口
  server.mjs            # 本地 viewer 服务（SSE）
  lib/
    explain-command.mjs # 解释引擎（规则匹配 + 组装）
    parse-command.mjs   # shell 命令 tokenizer
    redact-command.mjs  # 脱敏层
    risk-detector.mjs   # 风险检测
    learning-log.mjs    # 写入 events.jsonl 和 learning-log.md
  rules/
    commands.mjs        # 本地规则库
public/
  index.html
  app.js                # SSE 客户端，实时渲染解释和风险
  style.css             # 终端风格暗色主题
test/
  redact.test.mjs       # 脱敏测试（11 个用例）
  risk.test.mjs         # 风险检测测试（12 个用例）
docs/
  implementation-and-market-research.md
  next-steps.md
```

---

## 设计边界

- 只解释命令层面的确定含义，不猜业务接口语义。
- 脱敏在写入日志前执行，不可跳过。
- Hook 默认不阻塞 agent 执行。
- URL 路径的业务含义不做断言，最多写"从命名看，可能是……"。

---

## 运行测试

```bash
npm test
```

使用 Node 18 内置 `node:test`，无需额外依赖。
