import type { Handler } from "@netlify/functions"

const CLIENT_ID = process.env.VITE_GITHUB_CLIENT_ID!
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET!

export const handler: Handler = async (event) => {
  try {
    const code = event.queryStringParameters?.code

    if (!code) {
      return {
        statusCode: 400,
        body: "Missing code",
      }
    }

    const tokenRes = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          code,
        }),
      }
    )

    const tokenData = await tokenRes.json()

    if (!tokenData.access_token) {
      return {
        statusCode: 500,
        body: JSON.stringify(tokenData),
      }
    }

    const accessToken = tokenData.access_token

    return {
      statusCode: 302,
      headers: {
        Location: `/dashboard?token=${accessToken}`,
      },
    }
  } catch (err: any) {
    return {
      statusCode: 500,
      body: err.message,
    }
  }
}
