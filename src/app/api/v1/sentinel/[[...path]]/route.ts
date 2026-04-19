import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.NEXT_PUBLIC_API_URL || 'https://intuitive-blessing-production-30de.up.railway.app'

async function proxy(request: NextRequest, path: string[]) {
  const segment = path.length > 0 ? `/${path.join('/')}` : ''
  const url = `${BACKEND}/api/v1/sentinel${segment}${request.nextUrl.search}`

  try {
    const isGet = request.method === 'GET'
    const body = isGet ? undefined : await request.text()

    const res = await fetch(url, {
      method: request.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('authorization') ?? '',
        'X-Api-Key': request.headers.get('x-api-key') ?? '',
      },
      ...(body ? { body } : {}),
    })
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: 'proxy_error' }, { status: 502 })
  }
}

export async function GET(request: NextRequest, { params }: { params: { path?: string[] } }) {
  return proxy(request, params.path ?? [])
}

export async function POST(request: NextRequest, { params }: { params: { path?: string[] } }) {
  return proxy(request, params.path ?? [])
}
