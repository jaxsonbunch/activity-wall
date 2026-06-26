import type { Handler } from "@netlify/functions"

export const handler: Handler = async (event) => {
  const clientId = process.env.GITHUB_CLIENT_ID

  if (!clientId) {
    return {
      statusCode: 500,
      body: "GitHub OAuth is not configured. GITHUB_CLIENT_ID is missing.",
    }
  }

  const host = event.headers["x-forwarded-host"] || event.headers.host
  const proto = event.headers["x-forwarded-proto"] || "https"
  const redirectUri = `${proto}://${host}/.netlify/functions/github-callback`

  const scope = "read:user repo"

  const url =
    "https://github.com/login/oauth/authorize" +
    `?client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(scope)}`

  return {
    statusCode: 302,
    headers: {
      Location: url,
    },
    body: "",
  }
}
