# 下一步计划

## 现在已经有的初步功能

- `npm run explain -- "<command>"`: 手动解释命令。
- `npm run demo`: 用 `curl -s -X POST ...` 生成示例学习日志。
- `npm run hook:test`: 模拟 Claude Code hook payload。
- `npm run serve`: 启动本地事件查看页。

## 接 Git 后建议先做

1. 固定 Claude Code hook 的真实 payload 字段。
2. 把 hook 配置补成可安装插件结构。
3. 把当前轻量 parser 换成更可靠的 Bash parser。
4. 扩充规则库，先覆盖 `curl`、`git`、`npm`、`docker`、`rg`。
5. 给脱敏和风险检测补测试。
6. viewer 从轮询改成 SSE。

## 第一轮验收标准

- agent 运行 Bash 命令后，`.command-learning/learning-log.md` 自动出现解释。
- 敏感 token 不进入日志。
- viewer 能看到最近命令。
- hook 不阻塞 agent 执行。
