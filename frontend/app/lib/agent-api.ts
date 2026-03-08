import { api } from './api'
import { AgentSessionResponse, AgentSessionStateResponse } from '@/types'

export async function createAgentSession(userId: string, query: string) {
  return api.post<AgentSessionResponse>('/api/agent/sessions', {
    user_id: userId,
    query,
  })
}

export async function getAgentSession(sessionId: string) {
  return api.get<AgentSessionStateResponse>(`/api/agent/sessions/${sessionId}`)
}

export async function sendAgentMessage(sessionId: string, userId: string, message: string) {
  return api.post<AgentSessionResponse>(`/api/agent/sessions/${sessionId}/message`, {
    user_id: userId,
    message,
  })
}
