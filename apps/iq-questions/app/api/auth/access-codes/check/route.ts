import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'
const APP_KEY = 'iq-questions'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, appKey } = body

    const response = await fetch(`${BACKEND_URL}/auth/access-codes/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: code?.trim(),
        appKey: appKey || APP_KEY,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json(
        { error: errorData.message || 'Failed to verify access code' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    console.error('Proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to verify access code' },
      { status: 500 }
    )
  }
}

