import { createAuthClient } from 'better-auth/react'

// The auth handler is mounted at /sgs/api/auth/$ (see routes/sgs/api/auth/$.ts)
// rather than the default /api/auth — without this, the client calls
// unprefixed paths (e.g. /api/auth/get-session) that 404 once this app
// lives under the /sgs prefix.
export const authClient = createAuthClient({ basePath: '/sgs/api/auth' })
