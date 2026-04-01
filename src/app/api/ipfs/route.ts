import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const pinataJwt = process.env.PINATA_JWT

  if (!pinataJwt) {
    return NextResponse.json(
      { error: 'IPFS pinning is not configured on this deployment.' },
      { status: 501 }
    )
  }

  try {
    const body = await request.json()

    const pinataResponse = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pinataJwt}`
      },
      body: JSON.stringify({
        pinataContent: body,
        pinataMetadata: {
          name: `agnej-replay-${Date.now()}`
        }
      })
    })

    if (!pinataResponse.ok) {
      const errorText = await pinataResponse.text()
      return NextResponse.json(
        { error: `Pinata upload failed: ${errorText}` },
        { status: pinataResponse.status }
      )
    }

    const result = await pinataResponse.json()

    return NextResponse.json({ cid: result.IpfsHash })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown IPFS upload error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
