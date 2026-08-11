# OpenAI Agents HITL Starter (Python)

A standalone EdgeOne Makers template for the OpenAI Agents SDK (Python), demonstrating human-in-the-loop tool approval with persistent `RunState` and an integrated React frontend.

**Framework:** OpenAI Agents SDK · **Category:** Human in the loop · **Language:** Python

[![Deploy to EdgeOne Makers](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://edgeone.ai/makers/new?template=openai-agents-hitl-starter-python&from=within&fromAgent=1&agentLang=python)

## What this template demonstrates

- **Persistent approvals** — `POST /hitl` stores `result.to_state().to_string()` in `context.store.state` when a tool needs approval.
- **Approve or reject** — send a decision to restore the state with `await RunState.from_string(agent, serialized)`, then call `state.approve()` or `state.reject()` and resume the run.
- **Server-only state** — the browser sends only the message or decision; serialized `RunState` never appears in frontend payloads.
- **Purpose-built workbench page** — the frontend is a state-machine workbench (start → awaiting approval → approve/reject → completed) with a phase log; it is not a generic chat starter.

The example `submit_order` tool always requires approval. It is a safe demo action and can be replaced with a real side effect in your application.

## Routes

| Route | Method | Purpose |
|---|---|---|
| `/chat` | POST | Ordinary SSE streaming chat with session memory and sample tools. |
| `/hitl` | POST | Start an agent request or resume a pending approval. |
| `/stop` | POST | Stop an active ordinary chat run. |
| `/history` | POST | Load ordinary chat history. |

The `/hitl` request must include the `makers-conversation-id` header. Start a run with `{ "action": "start", "message": "Please submit order A-100" }`. When approval is needed, the response is `awaiting_approval` with an interruptions summary (tool name and arguments), not serialized state. Continue with `{ "action": "resume", "approved": true }` or `{ "action": "resume", "approved": false }`. Completed runs clean up their saved state. Missing or corrupt state returns HTTP 409 with `AGENT_STATE_NOT_FOUND` / `AGENT_STATE_CORRUPT`.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `AI_GATEWAY_API_KEY` | Yes | Model gateway API key, such as a Makers Models API key. |
| `AI_GATEWAY_BASE_URL` | Yes | OpenAI-compatible gateway URL, for example `https://ai-gateway.edgeone.link/v1`. |
| `AI_GATEWAY_MODEL` | No | Model ID. Defaults to `@makers/deepseek-v4-flash`. |

## Local development

Prerequisites: Node.js ≥ 18, Python ≥ 3.10, and the EdgeOne CLI (`npm i -g edgeone`).

```bash
npm install
pip install -r requirements.txt
cp .env.example .env
edgeone makers dev
```

Open the frontend — the approval workbench is the whole page. Local agent metrics and traces are available at `http://localhost:8080/agent-metrics`.

## Project structure

```text
openai-agents-hitl-starter-python/
├── agents/
│   ├── chat/index.py       # POST /chat — ordinary streaming chat
│   ├── hitl/index.py       # POST /hitl — approval + RunState persistence
│   ├── stop/index.py       # POST /stop
│   ├── _logger.py          # Logger utility (private)
│   └── _tools.py           # Ordinary chat tools (private)
├── cloud-functions/        # Stateless history/conversation functions
├── src/
│   ├── App.tsx             # Approval workbench page (state machine stage + phase log)
│   ├── api.ts              # /hitl request wrapper
├── package.json
├── requirements.txt
└── edgeone.json
```

## Resources

- [EdgeOne Makers Agents documentation](https://pages.edgeone.ai/document/agents)
- [OpenAI Agents SDK human-in-the-loop guide](https://openai.github.io/openai-agents-python/human_in_the_loop/)
- [Makers Models](https://pages.edgeone.ai/document/models)

## License

MIT.
