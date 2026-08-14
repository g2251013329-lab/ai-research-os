export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      if (typeof body?.detail === 'string') detail = body.detail
    } catch {
      /* keep statusText */
    }
    throw new ApiError(res.status, detail)
  }
  return res.json() as Promise<T>
}

/** Multipart upload (e.g. PDF drag & drop). */
export async function uploadFile<T = unknown>(
  path: string,
  file: File,
  extra: Record<string, string> = {},
): Promise<T> {
  const fd = new FormData()
  fd.append('file', file)
  for (const [k, v] of Object.entries(extra)) {
    if (v) fd.append(k, v)
  }
  const res = await fetch(path, { method: 'POST', body: fd })
  if (!res.ok) {
    let detail = res.statusText
    try {
      detail = (await res.json()).detail ?? detail
    } catch {
      /* keep statusText */
    }
    throw new ApiError(res.status, detail)
  }
  return res.json() as Promise<T>
}
