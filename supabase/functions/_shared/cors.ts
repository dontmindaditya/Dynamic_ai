// ============================================================
// supabase/functions/_shared/cors.ts
// CORS headers for all edge function responses
// All calls are server-to-server from FastAPI — but Supabase
// Edge Functions still need CORS for the preflight OPTIONS check
// ============================================================

export const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id',
}

// Use at the top of every edge function handler:
//
//   if (req.method === 'OPTIONS') {
//     return new Response(null, { status: 204, headers: CORS_HEADERS })
//   }

export function corsResponse(
  body: unknown,
  status = 200
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
    },
  })
}

export function corsError(
  message: string,
  status = 500
): Response {
  return corsResponse({ error: message }, status)
}