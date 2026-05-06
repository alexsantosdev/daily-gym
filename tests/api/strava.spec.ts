import { expect, test } from "@playwright/test"

test.describe("Strava API contracts @api @contract", () => {
  test("returns Strava client configuration envelope @smoke", async ({
    request,
  }) => {
    const response = await request.get("/api/strava/config")

    await expect(response).toBeOK()
    expect(response.headers()["content-type"]).toContain("application/json")

    const body = await response.json()
    expect(body).toEqual({ clientId: "" })
  })

  test("rejects webhook challenge without required params @negative", async ({
    request,
  }) => {
    const response = await request.get("/api/strava/webhooks")

    expect(response.status()).toBe(400)
    expect(await response.json()).toMatchObject({
      error: "Webhook challenge invalido.",
    })
  })

  test("rejects webhook challenge with invalid token @negative", async ({
    request,
  }) => {
    const response = await request.get(
      "/api/strava/webhooks?hub.mode=subscribe&hub.challenge=abc123&hub.verify_token=wrong"
    )

    expect(response.status()).toBe(403)
    expect(await response.json()).toMatchObject({
      error: "verify_token invalido.",
    })
  })

  test("accepts valid webhook challenge @critical", async ({ request }) => {
    const response = await request.get(
      "/api/strava/webhooks?hub.mode=subscribe&hub.challenge=abc123&hub.verify_token=playwright-token"
    )

    await expect(response).toBeOK()
    expect(await response.json()).toEqual({ "hub.challenge": "abc123" })
  })

  test("ignores malformed webhook payloads without touching external services", async ({
    request,
  }) => {
    const response = await request.post("/api/strava/webhooks", {
      data: {
        object_type: "unknown",
      },
    })

    await expect(response).toBeOK()
    expect(await response.json()).toEqual({ ok: true, ignored: true })
  })

  test("rejects Strava token exchange without a code @negative", async ({
    request,
  }) => {
    const response = await request.post("/api/strava/exchange", {
      data: {},
    })

    expect(response.status()).toBe(400)
    expect(await response.json()).toMatchObject({
      error: "Codigo OAuth do Strava nao informado.",
    })
  })

  test("rejects Strava import with incomplete credentials @negative", async ({
    request,
  }) => {
    const response = await request.post("/api/strava/import-runs", {
      data: {
        connection: {
          accessToken: "token-only",
        },
      },
    })

    expect(response.status()).toBe(400)
    expect(await response.json()).toMatchObject({
      error: "Credenciais do Strava incompletas para importacao.",
    })
  })

  test("rejects subscription delete without a numeric id @negative", async ({
    request,
  }) => {
    const response = await request.delete(
      "/api/strava/webhooks/subscription?subscriptionId=invalid"
    )

    expect(response.status()).toBe(400)
    expect(await response.json()).toMatchObject({
      error: "subscriptionId invalido.",
    })
  })
})
