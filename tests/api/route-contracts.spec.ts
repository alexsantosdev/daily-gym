import { expect, test } from "@playwright/test"

test.describe("route method and error contracts @api @contract", () => {
  test("returns method not allowed for unsupported route methods @negative", async ({
    request,
  }) => {
    const responses = []
    responses.push(await request.get("/api/personal-ai"))
    responses.push(await request.get("/api/gpt-report"))
    responses.push(await request.get("/api/workout-share-analysis"))
    responses.push(await request.post("/api/strava/config"))

    for (const response of responses) {
      expect(response.status()).toBe(405)
    }
  })

  test("reports missing Strava credentials on subscription listing @negative", async ({
    request,
  }) => {
    const response = await request.get("/api/strava/webhooks/subscription")

    expect(response.status()).toBe(500)
    expect(response.headers()["content-type"]).toContain("application/json")

    const body = await response.json()
    expect(body.error).toContain("STRAVA_CLIENT_ID")
  })

  test("reports missing Strava credentials on subscription creation @negative", async ({
    request,
  }) => {
    const response = await request.post("/api/strava/webhooks/subscription", {
      data: { callbackUrl: "http://127.0.0.1:3000/api/strava/webhooks" },
    })

    expect(response.status()).toBe(500)
    expect(response.headers()["content-type"]).toContain("application/json")

    const body = await response.json()
    expect(body.error).toContain("STRAVA_CLIENT_SECRET")
  })

  test("returns infrastructure error when Strava OAuth exchange lacks server env @negative", async ({
    request,
  }) => {
    const response = await request.post("/api/strava/exchange", {
      data: { code: "dummy-oauth-code" },
    })

    expect(response.status()).toBe(500)
    expect(response.headers()["content-type"]).toContain("application/json")

    const body = await response.json()
    expect(body.error).toContain("STRAVA_CLIENT_ID")
  })

  test("returns infrastructure error when Strava import needs refresh without server env @negative", async ({
    request,
  }) => {
    const response = await request.post("/api/strava/import-runs", {
      data: {
        connection: {
          accessToken: "playwright-access-token",
          refreshToken: "playwright-refresh-token",
          expiresAt: 0,
        },
      },
    })

    expect(response.status()).toBe(500)
    expect(response.headers()["content-type"]).toContain("application/json")

    const body = await response.json()
    expect(body.error).toContain("STRAVA_CLIENT_SECRET")
  })
})
