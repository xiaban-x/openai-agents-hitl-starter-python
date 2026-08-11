# OpenAI Agents HITL Starter（Python）

运行在 EdgeOne Makers 上的独立 OpenAI Agents SDK（Python）模板：演示带持久化 `RunState` 的人工审批流程，并集成 React 前端面板。

**Framework：** OpenAI Agents SDK · **Category：** Human in the loop · **Language：** Python

[![Deploy to EdgeOne Makers](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://edgeone.ai/makers/new?template=openai-agents-hitl-starter-python&from=within&fromAgent=1&agentLang=python)

## 模板能力

- **持久化审批** —— 工具需要审批时，`POST /hitl` 将 `result.to_state().to_string()` 保存到 `context.store.state`。
- **批准或拒绝** —— 决策请求会通过 `await RunState.from_string(agent, serialized)` 恢复状态，再调用 `state.approve()` 或 `state.reject()` 继续运行。
- **状态仅保存在服务端** —— 浏览器只发送消息或决策，序列化的 `RunState` 不会进入前端请求或响应。
- **集成 HITL 面板** —— 前端展示待审批工具调用、执行结果和错误。
- **普通聊天仍可用** —— `POST /chat` 保持普通流式聊天、会话记忆和示例工具能力。

示例 `send_email` 工具始终需要人工审批。它是安全的演示动作，可替换为实际副作用。

## 路由

| 路由 | 方法 | 用途 |
|---|---|---|
| `/chat` | POST | 带会话记忆和示例工具的普通 SSE 流式聊天。 |
| `/hitl` | POST | 启动 Agent 请求或恢复待审批运行。 |
| `/stop` | POST | 停止普通聊天运行。 |
| `/history` | POST | 加载普通聊天历史。 |

`/hitl` 请求必须携带 `makers-conversation-id` 请求头。使用 `{ "message": "Send an email..." }` 启动；需要审批时，响应只包含工具名和参数摘要，不包含序列化状态。随后发送 `{ "action": "approve", "approvalIndex": 0 }` 或 `{ "action": "reject", "approvalIndex": 0 }`。运行完成后会清理服务端状态。

## 环境变量

| 变量 | 必填 | 说明 |
|---|---|---|
| `AI_GATEWAY_API_KEY` | 是 | 模型网关 API Key，例如 Makers Models API Key。 |
| `AI_GATEWAY_BASE_URL` | 是 | OpenAI 兼容网关地址，例如 `https://ai-gateway.edgeone.link/v1`。 |
| `AI_GATEWAY_MODEL` | 否 | 模型 ID，默认 `@makers/deepseek-v4-flash`。 |

## 本地开发

前置依赖：Node.js ≥ 18、Python ≥ 3.10，以及 EdgeOne CLI（`npm i -g edgeone`）。

```bash
npm install
pip install -r requirements.txt
cp .env.example .env
edgeone makers dev
```

打开前端并选择 **HITL** 面板。本地 Agent 指标和 Trace 位于 `http://localhost:8080/agent-metrics`。

## 项目结构

```text
openai-agents-hitl-starter-python/
├── agents/
│   ├── chat/index.py       # POST /chat —— 普通流式聊天
│   ├── hitl/index.py       # POST /hitl —— 审批与 RunState 持久化
│   ├── stop/index.py       # POST /stop
│   ├── _logger.py          # 日志工具（私有）
│   └── _tools.py           # 普通聊天工具（私有）
├── cloud-functions/        # 无状态 history/conversation 函数
├── src/
│   ├── App.tsx             # 聊天应用与 HITL 面板集成
│   ├── api.ts              # /chat 与 /hitl 请求封装
│   └── components/HitlPanel.tsx
├── package.json
├── requirements.txt
└── edgeone.json
```

## 资源

- [EdgeOne Makers Agents 文档](https://pages.edgeone.ai/document/agents)
- [OpenAI Agents SDK 人工审批指南](https://openai.github.io/openai-agents-python/human_in_the_loop/)
- [Makers Models](https://pages.edgeone.ai/document/models)

## License

MIT。
