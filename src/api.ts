/**
 * Backend API — EdgeOne Makers, OpenAI Agents HITL demo.
 * Only the /hitl route is used by this page: start a run that must pause
 * for human approval, then resume it after approve/reject.
 */

import type { HitlResponse } from './types';

export class HitlApiError extends Error {
  status: number;
  code?: string;
  data?: HitlResponse;

  constructor(message: string, status: number, code?: string, data?: HitlResponse) {
    super(message);
    this.name = 'HitlApiError';
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

export type HitlAction = 'start' | 'resume';

export async function sendHitlAction(
  conversationId: string,
  action: HitlAction,
  payload: Record<string, unknown>,
): Promise<HitlResponse> {
  let response: Response;
  try {
    response = await fetch('/hitl', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'makers-conversation-id': conversationId,
      },
      body: JSON.stringify({ action, ...payload }),
    });
  } catch (err) {
    throw new HitlApiError(
      err instanceof Error ? err.message : String(err),
      0,
      'NETWORK_ERROR',
    );
  }

  const text = await response.text();
  let data: HitlResponse | null = null;
  try {
    data = text ? (JSON.parse(text) as HitlResponse) : null;
  } catch {
    throw new HitlApiError('HITL response was not valid JSON', response.status);
  }

  if (!response.ok) {
    throw new HitlApiError(
      data?.message || data?.error || `HTTP ${response.status}`,
      response.status,
      data?.code,
      data ?? undefined,
    );
  }
  if (!data) {
    throw new HitlApiError('HITL response was empty', response.status);
  }
  return data;
}
