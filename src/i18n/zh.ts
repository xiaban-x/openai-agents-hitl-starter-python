const zh = {
  "app.wordmark": "openai/hitl",
  "app.title": "RunState 审批工作台",
  "app.subtitle": "EdgeOne Makers 上的 Human-in-the-loop · OpenAI Agents SDK",
  "app.conversation": "会话",
  "app.newConversation": "新会话",

  "stage.idle.title": "发起一个需要人工审批的操作",
  "stage.idle.hint": "Agent 将调用 submit_order。未经人工批准工具不会执行——等待中的 RunState 持久化在服务端，而不是本页面。",
  "stage.idle.label": "指令",
  "stage.idle.default": "请提交订单 A-100",
  "stage.idle.start": "开始审批运行",

  "stage.awaiting.title": "需要审批",
  "stage.awaiting.hint": "运行已暂停。RunState 存在 context.store.state 里——你现在可以重启 dev 进程，这张卡片仍然能恢复。",
  "stage.awaiting.tool": "工具",
  "stage.awaiting.input": "入参",
  "stage.awaiting.approve": "批准",
  "stage.awaiting.reject": "拒绝",

  "stage.done.title": "运行完成",
  "stage.done.output": "最终输出",
  "stage.done.again": "再开始一个",

  "phase.start": "发起",
  "phase.resume": "恢复",
  "phase.cleanup": "清理",
  "phase.error": "错误",
  "log.title": "阶段日志",
  "log.empty": "暂无请求",

  "error.title": "请求失败",
  "error.code": "错误码",
  "error.status": "HTTP",

  "common.loading": "处理中…",
  "common.lang": "English",
} as const;

export default zh;
