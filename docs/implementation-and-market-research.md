# 实时命令学习文档插件实施方案

日期：2026-06-29

## 1. 项目定位

这个插件面向 Claude Code、Codex CLI 或类似 agent 编程工具的使用场景：当 agent 执行 Bash 命令时，插件在旁边生成一份实时学习文档，解释命令的通用含义、参数作用、管道关系和风险点。

它不做“业务接口猜测”。例如：

```bash
curl -s -X POST http://127.0.0.1:4317/api/control/start
```

插件应该解释：

- `curl` 用于发起网络请求。
- `-s` 是 silent 模式，会隐藏进度条和非必要输出。
- `-X POST` 指定 HTTP 请求方法为 `POST`。
- `127.0.0.1` 指本机地址。

插件不应该断言 `/api/control/start` 一定是在启动服务。最多可以写：“从路径命名看，它可能是某个本地控制接口，具体语义取决于该服务实现。”

## 2. 核心判断：实时比解释更重要

命令解释本身已经有不少工具能做。这个产品的价值在于它跟着 agent 的执行节奏走：

- agent 一发起 Bash 命令，文档立刻出现一条记录。
- 规则库能识别的参数马上解释。
- 模型解释可以慢一点，但不能卡住 agent 执行。
- 用户能一边看 agent 干活，一边理解命令，而不是事后复制命令去问另一个工具。

建议把第一版实时体验定成明确指标：

| 项目 | 目标 |
| --- | --- |
| 原始命令出现在文档中 | 200ms 内 |
| 本地规则解释完成 | 500ms 内 |
| 风险提示出现 | 500ms 内 |
| 模型补充解释完成 | 3 到 8 秒内，异步追加 |
| 对 agent 执行的阻塞 | 默认 0 阻塞 |

实时文档可以采用“先占位、后补全”的方式：

````md
## 16:42:10 curl

状态：解释中

```bash
curl -s -X POST http://127.0.0.1:4317/api/control/start
```
````

随后更新为：

````md
## 16:42:10 curl

状态：已解释

```bash
curl -s -X POST http://127.0.0.1:4317/api/control/start
```

- `curl`: 发起网络请求或下载内容。
- `-s`: silent 模式，隐藏进度条和非必要输出。
- `-X POST`: 指定 HTTP 方法为 `POST`。
- `127.0.0.1`: 本机地址，常用于访问本地服务。
````

## 3. 市场调研

### 3.1 已有相邻产品

| 产品或功能 | 相关能力 | 和本项目的差异 |
| --- | --- | --- |
| [explainshell](https://explainshell.com/) | 用户手动输入 shell 命令，网页将参数映射到帮助文档。 | 不接入 agent 执行流程；不实时；不生成持续学习文档；偏 man page 解释。 |
| [tldr pages](https://tldr.sh/) | 给常见命令提供简短示例。 | 解释命令用法，不解释当前 agent 正在执行的具体命令。 |
| [GitHub Copilot CLI](https://docs.github.com/en/copilot/concepts/agents/about-copilot-cli) | 在终端中通过自然语言协助开发、执行任务。 | 重点是 agent 执行和终端协作；未看到“每条 Bash 命令实时旁注成学习文档”的产品形态。 |
| [Warp AI](https://docs.warp.dev/features/warp-ai) | 在终端里提供 AI 生成命令、调试、agent 操作等能力。 | 更像 AI 原生终端；不主打把 agent 执行的命令实时沉淀为学习笔记。 |
| [Amazon Q Developer CLI / Kiro CLI](https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/command-line.html) | 终端里的开发助手和命令行 agent。 | 侧重任务执行与对话；未看到实时命令学习文档作为核心功能。 |
| [Claude Code hooks](https://docs.anthropic.com/en/docs/claude-code/hooks) | 允许在工具调用前后运行自定义命令。 | 这是很好的实现基础，不是直接竞品。需要我们把 hook 事件转成学习文档。 |
| [Claude Code plugins](https://code.claude.com/docs/en/plugins) | 支持把 slash commands、agents、hooks 等能力打包成插件。 | 插件机制适合分发本项目，但本身不提供学习文档功能。 |

### 3.2 市场空位

目前能看到三类相邻能力：

1. 命令解释工具：explainshell、tldr、各类 “explain this command” AI 工具。
2. AI 终端：Warp、GitHub Copilot CLI、Amazon Q/Kiro CLI。
3. Agent hook 平台：Claude Code hooks、插件系统。

还没有看到一个明确产品化的功能：agent 每执行一条 Bash 命令，旁边实时生成可积累、可搜索、可复习的学习文档。

这个空位值得做。它不是又一个“问 AI 解释命令”的工具，而是把 agent 执行过程变成教学素材。

## 4. 目标用户

第一批用户建议锁定三类：

- 正在学习命令行、Git、HTTP API、Docker 的开发者。
- 使用 Claude Code、Codex CLI、Cursor agent、Cline 等工具，但想理解 agent 为什么运行这些命令的人。
- 需要复盘 agent 操作过程的团队，例如教学、培训、内部开发规范推广。

用户打开 agent 后，不需要改变工作流。插件自动在旁边记录：

- agent 运行了什么命令。
- 命令中的参数是什么意思。
- 这条命令属于哪类操作。
- 是否有权限、删除、网络下载、管道执行等风险点。

## 5. 技术架构

建议分成七层。

### 5.1 Capture：命令捕获层

优先接入 Claude Code hooks：

- `PreToolUse`：捕获 Bash 命令。适合在命令执行前写入“原始命令”和初步解释。
- `PostToolUse`：补充执行状态、耗时、是否失败。
- `Notification` 或 `Stop`：可用于生成阶段总结。

Claude Code hooks 支持异步运行。第一版建议把解释 hook 设为异步，避免影响 agent 执行。

推荐策略：

1. `PreToolUse` 捕获命令。
2. 立刻写入 `events.jsonl`。
3. 后台 worker 读取事件，生成解释。
4. 文档渲染器更新 Markdown 或侧边栏页面。

如果目标平台不是 Claude Code，可以做抽象接口：

```ts
interface CommandEvent {
  source: "claude-code" | "codex" | "manual";
  sessionId: string;
  commandId: string;
  command: string;
  cwd?: string;
  timestamp: string;
}
```

### 5.2 Parser：命令解析层

不要靠空格切命令。第一版可以用 `shell-quote` 或 `bash-parser` 做基础解析，后期切到 `tree-sitter-bash` 支持复杂语法。

需要识别：

- 主命令：`curl`
- 短参数：`-s`
- 长参数：`--include`
- 带值参数：`-X POST`, `--header "Authorization: ..."`
- URL：`http://127.0.0.1:4317/...`
- 管道：`|`
- 重定向：`>`, `>>`, `2>&1`
- 串联：`&&`, `||`, `;`
- 子命令：`$(...)`
- 环境变量：`FOO=bar npm run dev`

第一版不需要完全解析所有 Bash 语法。遇到复杂命令时可以退回到“片段解释”：

```md
这条命令包含命令替换 `$()`，插件暂时只解释外层命令和可识别参数。
```

### 5.3 Redaction：脱敏层

学习文档默认会长期保存，所以脱敏必须放在解释前。

需要处理：

- `Authorization` header
- `Cookie`
- `token`
- `api_key`
- `password`
- `.env` 样式变量
- URL query 中的 `secret`, `key`, `token`
- Git remote URL 中的用户名密码

示例：

```bash
curl -H "Authorization: Bearer sk-abc123" https://api.example.com
```

文档中写：

```bash
curl -H "Authorization: Bearer [REDACTED]" https://api.example.com
```

### 5.4 Explain Engine：解释引擎

解释引擎采用“本地规则优先，模型兜底”。

本地规则负责高频命令：

- 网络：`curl`, `wget`, `nc`
- 文件：`ls`, `cd`, `cat`, `cp`, `mv`, `rm`, `mkdir`, `chmod`, `chown`
- 搜索：`grep`, `rg`, `find`
- Git：`git status`, `git diff`, `git show`, `git commit`, `git push`
- Node：`npm`, `pnpm`, `yarn`, `node`, `npx`
- Python：`python`, `pip`, `pytest`
- 容器：`docker`, `docker compose`
- 系统：`ps`, `kill`, `lsof`, `sudo`

规则库格式建议：

```json
{
  "command": "curl",
  "summary": "curl 用于向 URL 发起网络请求，也常用于下载内容或调用 HTTP API。",
  "flags": {
    "-s": "silent 模式，隐藏进度条和非必要输出。",
    "-X": "指定 HTTP 请求方法，例如 GET、POST、PUT、DELETE。",
    "-H": "添加 HTTP 请求头。"
  },
  "riskPatterns": [
    {
      "pattern": "curl.*\\|.*bash",
      "level": "high",
      "message": "这类命令会把网络下载的内容直接交给 shell 执行。执行前应确认来源可信。"
    }
  ]
}
```

模型只处理三件事：

- 规则库没覆盖的命令。
- 多命令组合的自然语言总结。
- 失败后的简短解释。

模型输出必须有约束：

- 不猜业务语义。
- 只解释命令层面的确定内容。
- 遇到 URL path、项目文件名、服务名时使用“可能”“从命名看”。
- 不输出密钥、token 或 cookie。

### 5.5 Storage：事件与索引

建议同时保存两类文件：

```txt
.command-learning/
  events.jsonl
  index.json
  learning-log.md
  rules/
    curl.json
    git.json
    filesystem.json
```

`events.jsonl` 作为事实记录：

```json
{"type":"command_started","id":"cmd_001","command":"curl -s ...","ts":"2026-06-29T08:42:10Z"}
{"type":"explanation_ready","id":"cmd_001","summary":"curl 用于...","ts":"2026-06-29T08:42:10Z"}
{"type":"command_finished","id":"cmd_001","exitCode":0,"durationMs":318,"ts":"2026-06-29T08:42:11Z"}
```

`learning-log.md` 面向用户阅读。

`index.json` 支持去重、搜索和复习：

```json
{
  "seenFlags": {
    "curl:-s": 12,
    "curl:-X": 5
  },
  "lastExplainedAt": {
    "curl:-s": "2026-06-29T08:42:10Z"
  }
}
```

### 5.6 Renderer：文档生成层

Markdown 是第一版最稳的载体。

每条命令生成一个块：

````md
## 16:42:10 `curl`

```bash
curl -s -X POST http://127.0.0.1:4317/api/control/start
```

**通用解释**

- `curl`: 发起网络请求或下载内容。
- `-s`: silent 模式，隐藏进度条和非必要输出。
- `-X POST`: 指定 HTTP 请求方法为 `POST`。
- `127.0.0.1`: 本机地址，常用于访问本地服务。

**风险提示**

未发现明显高风险模式。
````

后期可以增加“今日总结”：

```md
## 今日复盘

今天你遇到最多的是网络请求和 Git 查询命令。

建议掌握：

- `curl -s`
- `git diff --stat`
- `rg -n`
```

### 5.7 Viewer：旁边展示层

第一版先不强依赖宿主 UI，避免卡在平台限制上。

推荐分三步：

1. MVP：生成 `learning-log.md`，用户用编辑器或 Markdown preview 放在旁边。
2. V1：启动一个本地只读 Web 页面，实时读取 `events.jsonl`，用 SSE 或 WebSocket 推送更新。
3. V2：如果宿主支持插件 UI，再集成原生侧边栏。

Web 页面不要做成营销页。它应该像一个实时日志面板：

- 左侧按时间列出命令。
- 右侧显示解释。
- 默认滚动到最新命令。
- 支持暂停自动滚动。
- 支持搜索命令和参数。
- 支持“只看风险命令”。

## 6. MVP 计划

### 阶段 0：验证 hook 可用性，0.5 到 1 天

目标：

- 确认 Claude Code plugin 是否能通过 `hooks/hooks.json` 分发 hook。
- 确认 `PreToolUse` 能拿到 Bash 命令正文。
- 确认异步 hook 不阻塞 Bash 执行。
- 确认 hook 写入本地文件的权限边界。

交付：

- 一个最小 hook。
- 一条 Bash 命令触发一条 `events.jsonl` 记录。
- 一份验证记录。

验收：

- 运行 `curl -s -X POST ...` 后，200ms 到 500ms 内看到事件记录。

### 阶段 1：命令学习日志，2 到 3 天

目标：

- 捕获 Bash 命令。
- 脱敏。
- 解释 `curl`、`git`、`ls`、`cat`、`rg`、`npm`、`python`、`docker` 等高频命令。
- 追加写入 `learning-log.md`。

交付：

- `pre-tool-use` hook。
- `explain-command` worker。
- `rules/*.json`。
- `learning-log.md`。

验收：

- 示例命令能生成稳定解释。
- 规则库覆盖不到的命令不会胡乱解释，只写“暂未识别，可补充规则”。
- token、cookie、password 不出现在文档中。

### 阶段 2：实时旁边面板，3 到 5 天

目标：

- 做本地 Web viewer。
- 监听 `events.jsonl` 或通过本地服务接收事件。
- 页面实时显示命令和解释。

交付：

- `command-learning-viewer`。
- 自动滚动、搜索、风险过滤。
- 本地只读端口，例如 `127.0.0.1:48731`。

验收：

- agent 执行命令时，浏览器侧边页无需刷新即可更新。
- 高频命令连续执行时页面不卡。
- viewer 关闭不影响 agent 执行。

### 阶段 3：插件打包，2 到 3 天

目标：

- 按 Claude Code plugin 结构打包。
- 提供 slash command 管理插件状态。

建议命令：

```txt
/command-learning on
/command-learning off
/command-learning open
/command-learning summary
/command-learning redact-test
```

交付：

- 插件 manifest。
- hooks 配置。
- 安装说明。
- 默认规则库。

验收：

- 新项目安装后能马上记录 Bash 命令。
- 用户能关闭记录。
- 用户能清空或导出学习日志。

## 7. 后期计划

### V1.1：解释质量

- 支持管道分段解释。
- 支持多命令组合。
- 支持失败命令的常见原因说明。
- 支持规则库贡献机制。

示例：

```bash
curl -s http://localhost:3000/users | jq .
```

解释：

- `curl -s ...` 获取接口响应。
- `|` 把前一个命令的输出交给后一个命令。
- `jq .` 格式化 JSON。

### V1.2：学习体验

- 对已经解释过很多次的参数自动折叠。
- 新参数高亮。
- 每日总结。
- “加入我的速查表”。
- 按主题生成复习页：网络请求、文件操作、Git、包管理。

### V1.3：团队场景

- 支持项目级共享规则库。
- 支持团队禁用某些记录，例如不保存生产环境命令。
- 支持导出培训材料。
- 支持命令审计，但审计不能替代安全工具。

### V2：多 agent 平台

抽象 capture 层，支持：

- Claude Code
- Codex CLI
- Cursor agent
- Cline
- 自定义 shell wrapper

不同平台只需要实现 `CommandEvent` 输入适配器，后面的解析、脱敏、解释、文档生成保持一致。

## 8. 风险与对策

| 风险 | 影响 | 对策 |
| --- | --- | --- |
| Hook 阻塞 agent 执行 | 用户体验变差 | 默认异步 hook；本地规则优先；超时后丢弃模型补充。 |
| 敏感信息写入学习文档 | 严重安全问题 | 脱敏放在解释前；默认开启；提供 `redact-test`。 |
| Bash 语法复杂，解析错误 | 解释不准 | 使用 parser；复杂命令降级为片段解释。 |
| 模型猜业务语义 | 用户被误导 | prompt 约束；输出中区分“确定”和“推测”。 |
| 侧边栏依赖宿主 UI | 影响第一版落地 | 先做 Markdown 和本地 Web viewer。 |
| 日志越来越大 | 卡顿和阅读负担 | JSONL 归档；按日期拆分；重复参数折叠。 |
| 用户不想被记录 | 隐私顾虑 | 提供开关、项目级忽略、敏感目录禁用。 |

## 9. 第一版目录建议

```txt
command-learning-plugin/
  README.md
  package.json
  hooks/
    hooks.json
    pre-tool-use.ts
    post-tool-use.ts
  src/
    capture/
      command-event.ts
    parser/
      parse-shell-command.ts
    redact/
      redact-command.ts
    explain/
      explain-command.ts
      rules/
        curl.json
        git.json
        filesystem.json
        npm.json
    storage/
      append-event.ts
      update-index.ts
    render/
      render-markdown.ts
    viewer/
      server.ts
      public/
        index.html
        app.ts
  .command-learning/
    events.jsonl
    index.json
    learning-log.md
```

## 10. 实施建议

先做 Claude Code 版本，因为 hooks 和 plugins 已经提供了落点。不要第一版就追求多平台和复杂 UI。

推荐开发顺序：

1. 写 hook，确认能捕获 Bash 命令。
2. 写事件日志，先把命令实时落盘。
3. 写 `curl` 规则，用一个真实命令打通解释链路。
4. 加脱敏。
5. 扩展规则库。
6. 做本地 Web viewer。
7. 打包成插件。

第一版只要完成这句话就算成立：

> agent 一运行 Bash 命令，旁边 1 秒内出现一条靠谱、脱敏、可复习的命令解释。

## 11. 下一步可执行清单

- [ ] 用 Claude Code hook 做捕获 spike。
- [ ] 设计 `events.jsonl` schema。
- [ ] 实现 `curl`、`git`、`filesystem` 三个规则文件。
- [ ] 实现脱敏函数和测试样例。
- [ ] 输出第一版 `learning-log.md`。
- [ ] 做本地 viewer 原型。
- [ ] 打包为插件。
- [ ] 找 3 到 5 个真实 agent 执行 session 做体验验证。

## 12. 参考链接

- [explainshell](https://explainshell.com/)
- [tldr pages](https://tldr.sh/)
- [GitHub Copilot CLI](https://docs.github.com/en/copilot/concepts/agents/about-copilot-cli)
- [Warp AI](https://docs.warp.dev/features/warp-ai)
- [Amazon Q Developer CLI](https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/command-line.html)
- [Claude Code hooks](https://docs.anthropic.com/en/docs/claude-code/hooks)
- [Claude Code plugins](https://code.claude.com/docs/en/plugins)
