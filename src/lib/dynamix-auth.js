export function getSessionFromRequest(request) {
  const token = request.cookies.get('nama_token')?.value || null
  const agentEmail = request.cookies.get('nama_agent_email')?.value || null
  const agentName = request.cookies.get('nama_agent_name')?.value || null
  const demoCookie = request.cookies.get('nama_demo')?.value || null
  const isDemo = demoCookie === '1'

  return {
    token,
    agentEmail: agentEmail || (isDemo ? 'demo@getnama.app' : null),
    agentName: agentName || (isDemo ? 'Demo Agent' : null),
    isDemo,
    isAuthenticated: Boolean((token && agentEmail) || isDemo),
  }
}
