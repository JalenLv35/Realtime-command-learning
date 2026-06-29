# Realtime Command Learning

把 agent 执行的 Bash 命令实时沉淀成学习文档。

当 Claude Code 执行 Bash 命令时，插件在旁边生成一份实时学习记录，解释命令的通用含义、参数作用和风险点。目标是把 agent 的执行过程变成可积累、可复习的教学素材。

---

## 效果示例

agent 执行 `curl -s -X POST http://127.0.0.1:4317/api/control/start` 后，viewer 实时显示：

```
20:21:30  curl  · 进阶

curl -s -X POST http://127.0.0.1:4317/api/control/start

- `curl`   : curl 用于向 URL 发起网络请求，也常用于下载内容或调用 HTTP API。
- `-s`     : silent 模式，隐藏进度条和非必要输出。
- `-X POST`: 指定 HTTP 请求方法，例如 GET、POST、PUT、DELETE。
- `http://127.0.0.1:...`: 本机地址，常用于访问当前机器上运行的服务。
```

同时追加到 `.command-learning/learning-log.md`，可随时复习。

---

## 快速开始

**要求：** Node.js 18+

### 1. 配置 Claude Code Hook

把以下内容合并到项目的 `.claude/settings.json`，将 `PLUGIN_DIR` 替换为本项目的绝对路径：

```json
{
  "statusLine": {
    "type": "command",
    "command": "node PLUGIN_DIR/hooks/statusline.mjs"
  },
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [{ "type": "command", "command": "node PLUGIN_DIR/hooks/pre-tool-use.mjs", "timeout": 10 }]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Bash",
        "hooks": [{ "type": "command", "command": "node PLUGIN_DIR/hooks/post-tool-use.mjs", "timeout": 10 }]
      }
    ]
  }
}
```

配置后重启 Claude Code，对话框底部状态栏会出现：

```
CL: 进阶
```

### 2. 启动实时 Viewer

```bash
npm run serve
```

浏览器打开 `http://127.0.0.1:48731`，通过 SSE 实时推送，无需手动刷新。

### 3. 正常使用 Claude Code

```bash
claude
```

Claude Code 执行的每一条 Bash 命令都会自动出现在 viewer 里。

---

## 三种模式

Viewer 顶部工具栏有三个模式按钮，按命令复杂度过滤显示内容：

| 模式 | 显示内容 | 适合场景 |
|---|---|---|
| **新手** | 全部命令（ls、cat、git、docker… 都解释） | 刚接触命令行 |
| **进阶** | 过滤掉 ls/cat/cp/mv/mkdir 等基础操作 | 日常开发 |
| **精通** | 只看 rm/sudo/kill 等高级命令、风险操作、管道组合 | 只关心复杂/危险操作 |

选择的模式自动保存到 localStorage，刷新页面后保留。

---

## 插件控制

在 Claude Code 对话框中使用 `/command-learning` slash command 管理插件：

```
/command-learning              查看当前状态
/command-learning on           开启记录
/command-learning off          关闭记录
/command-learning mode 新手    切换为新手模式
/command-learning mode 进阶    切换为进阶模式
/command-learning mode 精通    切换为精通模式
```

模式切换后，底部状态栏随之更新：

```
CL: 精通        ← 开启时显示当前模式
CL: 关闭        ← 关闭时显示
```

> Viewer 的模式按钮和 slash command 的模式是独立的：前者控制页面显示哪些记录，后者控制 hook 写入时打的 level 标签。

---

## 命令规则库

本地规则覆盖约 20 个高频命令，500ms 内完成解释，不依赖模型：

| 类别 | 命令 |
|---|---|
| 网络 | `curl`、`wget`、`ssh` |
| 文件 | `ls`、`cat`、`cp`、`mv`、`rm`、`mkdir`、`chmod`、`find` |
| 搜索 | `grep`、`rg` |
| 进程 | `ps`、`kill`、`lsof`、`sudo` |
| Git | `git`（20+ 子命令和 flags） |
| Node | `npm`、`npx`、`pnpm`、`yarn`、`node` |
| Python | `python`、`pip` |
| 容器 | `docker`（15+ 子命令和 flags） |
| 符号 | `\|`、`>`、`>>`、`&&`、`\|\|`、`2>&1` |

规则库识别不到的命令，会在记录中注明"暂未收录"，不会乱猜。

---

## 隐私脱敏

写入日志前自动处理，覆盖：

- `Authorization: Bearer / Basic` token
- `Cookie` header
- `curl -u user:password`
- URL query 参数（`token`、`api_key`、`secret`、`password`）
- 环境变量（`GITHUB_TOKEN`、`NPM_TOKEN` 等）
- Git remote URL 中的嵌入凭证（`https://user:pass@github.com`）

---

## 风险提示

| 模式 | 级别 |
|---|---|
| `curl ... \| bash` | 高风险 |
| `rm -rf` / `rm -fr` | 高风险 |
| `sudo` | 中风险 |

高风险命令在 viewer 中会以红色左边框高亮显示。

---

## 手动使用

不接 Claude Code 也可以单独使用：

```bash
# 解释单条命令
npm run explain -- "git diff --stat HEAD~1"

# 内置 demo（curl 示例）
npm run demo

# 模拟 PreToolUse hook 触发
npm run hook:test

# 模拟 PostToolUse hook 触发
npm run hook:test-post
```

---

## 项目结构

```
hooks/
  hooks.json            # Claude Code hook 配置模板
  pre-tool-use.mjs      # PreToolUse hook（捕获命令、解释、写入记录）
  post-tool-use.mjs     # PostToolUse hook（记录执行结果）
  control.mjs           # 插件控制脚本（on/off/mode）
  statusline.mjs        # 状态栏脚本（显示当前模式）
src/
  cli.mjs               # 手动解释命令的 CLI 入口
  server.mjs            # 本地 viewer 服务（SSE 实时推送）
  lib/
    explain-command.mjs # 解释引擎（规则匹配 + level 计算）
    parse-command.mjs   # shell 命令 tokenizer
    redact-command.mjs  # 脱敏层
    risk-detector.mjs   # 风险检测
    learning-log.mjs    # 写入 events.jsonl 和 learning-log.md
  rules/
    commands.mjs        # 本地规则库（含每个命令的 level）
public/
  index.html            # Viewer 页面（含模式切换按钮）
  app.js                # SSE 客户端，实时渲染解释和风险
  style.css             # 终端风格暗色主题
.claude/
  commands/
    command-learning.md # /command-learning slash command 定义
test/
  redact.test.mjs       # 脱敏测试（11 个用例）
  risk.test.mjs         # 风险检测测试（12 个用例）
docs/
  implementation-and-market-research.md
  next-steps.md
```

---

## 运行测试

```bash
npm test
```

使用 Node 18 内置 `node:test`，无需额外依赖，23 个用例全覆盖脱敏和风险检测。

---

## 设计边界

- 只解释命令层面的确定含义，不猜业务接口语义。
- URL 路径的业务含义不做断言，最多写"从命名看，可能是……"。
- 脱敏在写入日志前执行，不可跳过。
- Hook 默认不阻塞 agent 执行（异步写入，超时自动放弃）。
