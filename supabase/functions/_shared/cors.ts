export const CORS_HEADERS: HeadersInit = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

export function corsResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: CORS_HEADERS,
  })
}

export function corsError(message: string, status = 500, extra?: Record<string, unknown>): Response {
  return corsResponse(
    {
      error: message,
      ...extra,
    },
    status,
  )
}
