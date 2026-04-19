import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const body = await req.json()
  const railwayUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    'https://intuitive-blessing-production-30de.up.railway.app'

  let res: Response
  try {
    res = await fetch(`${railwayUrl}/api/v1/quotations/${params.id}/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.NAMA_API_KEY || '',
      },
      body: JSON.stringify(body),
    })
  } catch (err) {
    return NextResponse.json(
      { success: false, detail: 'Could not reach the server. Please try again later.' },
      { status: 502 },
    )
  }

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
