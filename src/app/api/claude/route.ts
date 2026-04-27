import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { type, b64, mime, name } = await req.json()

  if (type === 'dieline') {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mime || 'image/png', data: b64 } },
            { type: 'text', text: `This is a packaging die line or 3D render file named "${name}". Extract:
1. Box finish dimensions (Length × Width × Height) in inches
2. Box style: tuck / mailer / sleeve / 2pc / 4corner / rigid-mag / rigid-book / corr-rsc / corr-mail
3. GSM if annotated
4. Any material notes

Respond ONLY as JSON (no markdown, no explanation):
{"L":0,"W":0,"H":0,"style":"tuck","gsm":0,"confidence":"high|medium|low","notes":""}` }
          ]
        }]
      })
    })

    const data = await resp.json()
    const text = data.content?.find((c: {type:string}) => c.type === 'text')?.text || '{}'
    try {
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
      return NextResponse.json(parsed)
    } catch {
      return NextResponse.json({ error: 'parse_failed' }, { status: 200 })
    }
  }

  return NextResponse.json({ error: 'unknown_type' }, { status: 400 })
}
