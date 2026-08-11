const en = {
  "app.wordmark": "openai/hitl",
  "app.title": "RunState approval workbench",
  "app.subtitle": "Human-in-the-loop on EdgeOne Makers · OpenAI Agents SDK",
  "app.conversation": "conversation",
  "app.newConversation": "new conversation",

  "stage.idle.title": "Arm an action that requires approval",
  "stage.idle.hint": "The agent will call submit_order. The tool never executes until a human approves — and the waiting RunState is persisted server-side, not in this page.",
  "stage.idle.label": "instruction",
  "stage.idle.default": "Please submit order A-100",
  "stage.idle.start": "start approval run",

  "stage.awaiting.title": "Approval required",
  "stage.awaiting.hint": "The run is paused. Its RunState lives in context.store.state — you can restart the dev process now and this card will still resume.",
  "stage.awaiting.tool": "tool",
  "stage.awaiting.input": "input",
  "stage.awaiting.approve": "approve",
  "stage.awaiting.reject": "reject",

  "stage.done.title": "Run completed",
  "stage.done.output": "final output",
  "stage.done.again": "start another",

  "phase.start": "start",
  "phase.resume": "resume",
  "phase.cleanup": "cleanup",
  "phase.error": "error",
  "log.title": "phase log",
  "log.empty": "no requests yet",

  "error.title": "request failed",
  "error.code": "code",
  "error.status": "http",

  "common.loading": "working…",
  "common.lang": "中文",
} as const;

export default en;
