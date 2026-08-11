import { useCallback, useEffect, useRef, useState } from 'react';
import { sendHitlAction, HitlApiError } from './api';
import type { HitlInterruption, HitlPhase, HitlResponse, PhaseLogEntry } from './types';
import { I18nProvider, useT } from './i18n';
import type { MessageKeys } from './i18n';

const CONVERSATION_ID_STORAGE_KEY = 'eo_hitl_conversation_id';

function getOrCreateConversationId(): string {
  const cached = localStorage.getItem(CONVERSATION_ID_STORAGE_KEY);
  if (cached) return cached;
  const id = crypto.randomUUID();
  localStorage.setItem(CONVERSATION_ID_STORAGE_KEY, id);
  return id;
}

interface PageError {
  message: string;
  code?: string;
  status?: number;
}

function formatInput(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    return String(value);
  }
}

function normalizeInterruptions(response: HitlResponse): HitlInterruption[] {
  if (Array.isArray(response.interruptions) && response.interruptions.length > 0) {
    return response.interruptions;
  }
  return response.approval ? [response.approval] : [];
}

function timeOf(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour12: false });
}

const RAIL_STEPS: Array<{ key: HitlPhase; glyph: string }> = [
  { key: 'idle', glyph: '01' },
  { key: 'awaiting_approval', glyph: '02' },
  { key: 'completed', glyph: '03' },
];

function AppInner() {
  const { t, lang, toggle } = useT();
  const [conversationId, setConversationId] = useState(getOrCreateConversationId);
  const [phase, setPhase] = useState<HitlPhase>('idle');
  const [message, setMessage] = useState('');
  const [interruptions, setInterruptions] = useState<HitlInterruption[]>([]);
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<PageError | null>(null);
  const [log, setLog] = useState<PhaseLogEntry[]>([]);
  const logIdRef = useRef(0);

  const defaultSetRef = useRef(false);
  useEffect(() => {
    if (!defaultSetRef.current) {
      defaultSetRef.current = true;
      setMessage(t('stage.idle.default'));
    }
  }, [t]);

  const pushLog = useCallback((phaseKey: PhaseLogEntry['phase'], ok: boolean, detail: string) => {
    logIdRef.current += 1;
    setLog(prev => [{ id: logIdRef.current, phase: phaseKey, ok, detail, at: Date.now() }, ...prev].slice(0, 30));
  }, []);

  const applyResponse = useCallback((response: HitlResponse) => {
    const next = normalizeInterruptions(response);
    const awaiting = response.status === 'awaiting_approval' || response.status === 'needs_approval' || next.length > 0;
    if (awaiting) {
      setPhase('awaiting_approval');
      setInterruptions(next);
      setOutput('');
    } else {
      setPhase('completed');
      setInterruptions([]);
      setOutput(response.output ?? '');
    }
  }, []);

  const runAction = useCallback(async (action: 'start' | 'resume', payload: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    try {
      const response = await sendHitlAction(conversationId, action, payload);
      applyResponse(response);
      pushLog(action, true, action === 'start' ? message.trim() : 'approved/rejected → resume');
    } catch (err) {
      const pageError: PageError = err instanceof HitlApiError
        ? { message: err.message, code: err.code, status: err.status }
        : { message: err instanceof Error ? err.message : String(err) };
      setError(pageError);
      pushLog('error', false, `${pageError.code ?? 'ERROR'} ${pageError.message}`.trim());
    } finally {
      setLoading(false);
    }
  }, [applyResponse, conversationId, message, pushLog]);

  const handleStart = useCallback(() => {
    const text = message.trim();
    if (!text || loading) return;
    void runAction('start', { message: text });
  }, [loading, message, runAction]);

  const handleApprove = useCallback(() => {
    if (loading) return;
    void runAction('resume', { approved: true });
  }, [loading, runAction]);

  const handleReject = useCallback(() => {
    if (loading) return;
    void runAction('resume', { approved: false });
  }, [loading, runAction]);

  const handleReset = useCallback(() => {
    if (loading) return;
    setPhase('idle');
    setInterruptions([]);
    setOutput('');
    setError(null);
    setMessage(t('stage.idle.default'));
  }, [loading, t]);

  const handleNewConversation = useCallback(() => {
    if (loading) return;
    const id = crypto.randomUUID();
    localStorage.setItem(CONVERSATION_ID_STORAGE_KEY, id);
    setConversationId(id);
    setPhase('idle');
    setInterruptions([]);
    setOutput('');
    setError(null);
    setLog([]);
    setMessage(t('stage.idle.default'));
  }, [loading, t]);

  const activeIndex = RAIL_STEPS.findIndex(s => s.key === phase);

  return (
    <div className="shell">
      <header className="topbar">
        <span className="wordmark">openai<span className="sep">/</span>hitl</span>
        <div className="titleblock">
          <h1>{t('app.title')}</h1>
          <p>{t('app.subtitle')}</p>
        </div>
        <div className="topbar-right">
          <span className="conv-chip" title={conversationId}>
            <span className="dot" />
            {t('app.conversation')}
            <code>{conversationId}</code>
          </span>
          <button type="button" className="link-btn" onClick={handleNewConversation} disabled={loading}>
            {t('app.newConversation')}
          </button>
          <button type="button" className="lang-toggle-btn" onClick={toggle}>
            {lang === 'zh' ? t('common.lang' as MessageKeys) : t('common.lang' as MessageKeys)}
          </button>
        </div>
      </header>

      <main className="workbench">
        <nav className="rail" aria-label="run phases">
          <div className="rail-title">run state</div>
          {RAIL_STEPS.map((step, index) => {
            const cls = index === activeIndex
              ? 'rail-step is-active'
              : index < activeIndex
                ? 'rail-step is-done'
                : 'rail-step';
            const label = t(`phase.${step.key === 'idle' ? 'start' : step.key === 'awaiting_approval' ? 'resume' : 'cleanup'}` as MessageKeys);
            return (
              <div className={cls} key={step.key}>
                <span className="glyph">{step.glyph}</span>
                <span>{label}</span>
              </div>
            );
          })}
        </nav>

        <section className="stage">
          {phase === 'idle' && (
            <>
              <div className="stage-head">
                <h2>{t('stage.idle.title')}</h2>
                <p>{t('stage.idle.hint')}</p>
              </div>
              <div className="card">
                <label className="field-label" htmlFor="hitl-message">{t('stage.idle.label')}</label>
                <textarea
                  id="hitl-message"
                  rows={3}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  disabled={loading}
                />
                <button type="button" className="primary-btn" onClick={handleStart} disabled={loading || !message.trim()}>
                  {loading ? t('common.loading') : t('stage.idle.start')}
                </button>
              </div>
            </>
          )}

          {phase === 'awaiting_approval' && (
            <>
              <div className="stage-head">
                <h2>{t('stage.awaiting.title')}</h2>
                <p>{t('stage.awaiting.hint')}</p>
              </div>
              <div className="card">
                {interruptions.map((item, index) => (
                  <div key={`${item.tool ?? item.name ?? 'tool'}-${index}`}>
                    <div className="field-label">{t('stage.awaiting.tool')}</div>
                    <div className="mono-block">{item.tool ?? item.name ?? 'tool'}</div>
                    <div className="field-label" style={{ marginTop: 'var(--space-3)' }}>{t('stage.awaiting.input')}</div>
                    <div className="mono-block">{formatInput(item.input ?? item.arguments)}</div>
                  </div>
                ))}
                <div className="approval-actions">
                  <button type="button" className="approve-btn" onClick={handleApprove} disabled={loading}>
                    {loading ? t('common.loading') : t('stage.awaiting.approve')}
                  </button>
                  <button type="button" className="reject-btn" onClick={handleReject} disabled={loading}>
                    {t('stage.awaiting.reject')}
                  </button>
                </div>
              </div>
            </>
          )}

          {phase === 'completed' && (
            <>
              <div className="stage-head">
                <h2>{t('stage.done.title')}</h2>
              </div>
              <div className="card">
                <div className="field-label">{t('stage.done.output')}</div>
                <div className="output-block">{output || '—'}</div>
                <button type="button" className="primary-btn" onClick={handleReset} disabled={loading}>
                  {t('stage.done.again')}
                </button>
              </div>
            </>
          )}

          {error && (
            <div className="error-strip" role="alert">
              <strong>{t('error.title')}</strong> — {error.message}
              {(error.code || error.status) && (
                <div className="meta">
                  {error.code ? `${t('error.code')}: ${error.code}` : ''}
                  {error.status ? ` · ${t('error.status')}: ${error.status}` : ''}
                </div>
              )}
            </div>
          )}

          <div className="log">
            <div className="log-title">{t('log.title')}</div>
            {log.length === 0 && <div className="log-empty">{t('log.empty')}</div>}
            {log.map(entry => (
              <div className="log-row" key={entry.id}>
                <span className={`log-phase${entry.ok ? '' : ' is-error'}`}>
                  {t(`phase.${entry.phase}` as MessageKeys)}
                </span>
                <span className="log-detail">{entry.detail}</span>
                <span className="log-time">{timeOf(entry.at)}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <AppInner />
    </I18nProvider>
  );
}
