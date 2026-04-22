export function getSessionFromRequest(request) {
  const token = request.cookies.get('nama_token')?.value || null
  const agentEmail = request.cookies.get('nama_agent_email')?.value || null
  const agentName = request.cookies.get('nama_agent_name')?.value || null

  return {
    token,
    agentEmail,
    agentName,
    isAuthenticated: Boolean(token && agentEmail),
  }
}
