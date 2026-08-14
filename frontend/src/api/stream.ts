/** POST with Server-Sent Events parsing (used for streaming AI chat). */
export async function postSSE(
  path: string,
  body: unknown,
  onEvent: (event: string, data: unknown) => void,
): Promise<void> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok || !res.body) {
    let detail = res.statusText
    try {
      detail = (await res.json()).detail ?? detail
    } catch {
      /* keep statusText */
    }
    throw new Error(detail)
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let idx: number
    while ((idx = buffer.indexOf('\n\n')) >= 0) {
      const chunk = buffer.slice(0, idx)
      buffer = buffer.slice(idx + 2)
      const eventLine = chunk.split('\n').find((l) => l.startsWith('event: '))
      const dataLine = chunk.split('\n').find((l) => l.startsWith('data: '))
      if (eventLine && dataLine) {
        const event = eventLine.slice(7).trim()
        let data: unknown = null
        try {
          data = JSON.parse(dataLine.slice(6))
        } catch {
          data = dataLine.slice(6)
        }
        onEvent(event, data)
      }
    }
  }
}
