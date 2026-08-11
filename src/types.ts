export interface HitlInterruption {
  index?: number;
  tool?: string;
  name?: string;
  input?: unknown;
  arguments?: unknown;
}

export interface HitlResponse {
  status?: 'awaiting_approval' | 'needs_approval' | 'completed';
  interruptions?: HitlInterruption[];
  approval?: HitlInterruption;
  output?: string;
  conversation_id?: string;
  error?: string;
  message?: string;
  code?: string;
}

export type HitlPhase = 'idle' | 'awaiting_approval' | 'completed';

export interface PhaseLogEntry {
  id: number;
  phase: 'start' | 'resume' | 'cleanup' | 'error';
  ok: boolean;
  detail: string;
  at: number;
}
