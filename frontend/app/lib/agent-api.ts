import { api } from './api'
import { AgentDeleteResponse, AgentEvent, AgentProjectLatestSessionResponse, AgentProjectSummary, AgentSessionResponse, AgentSessionStateResponse } from '@/types'

export type AgentTurnPayload = {
  user_id: string
  message?: string
  input_mode?: 'text' | 'multiple_choice' | 'start_mode'
  question_id?: string
  selected_option_id?: string
  selected_option_index?: number
}

export async function createAgentSession(userId: string, query: string) {
  return api.post<AgentSessionResponse>('/api/agent/sessions', {
    user_id: userId,
    query,
  })
}

export async function getAgentSession(sessionId: string) {
  return api.get<AgentSessionStateResponse>(`/api/agent/sessions/${sessionId}`)
}

export async function listAgentProjects(userId: string) {
  return api.get<AgentProjectSummary[]>(`/api/agent/projects?user_id=${encodeURIComponent(userId)}`)
}

export async function getProjectLatestSession(projectId: string, userId: string) {
  return api.get<AgentProjectLatestSessionResponse>(
    `/api/agent/projects/${projectId}/latest-session?user_id=${encodeURIComponent(userId)}`
  )
}

export async function deleteAgentProject(projectId: string, userId: string) {
  return api.delete<AgentDeleteResponse>(`/api/agent/projects/${projectId}?user_id=${encodeURIComponent(userId)}`)
}

export async function listAgentSessionEvents(sessionId: string, userId: string) {
  return api.get<AgentEvent[]>(`/api/agent/sessions/${sessionId}/events?user_id=${encodeURIComponent(userId)}`)
}

export async function sendAgentMessage(sessionId: string, payload: AgentTurnPayload) {
  return api.post<AgentSessionResponse>(`/api/agent/sessions/${sessionId}/message`, payload)
}
