import { existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import {
  DEFAULT_AUTHENTICATED_ROUTE,
  DESKTOP_NAV_ITEMS,
  MOBILE_NAV_ITEMS,
} from "@/lib/navigation"

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
)

describe("authenticated navigation", () => {
  it("uses calendar as the main authenticated route", () => {
    expect(DEFAULT_AUTHENTICATED_ROUTE).toBe("/calendar")
    expect(DESKTOP_NAV_ITEMS[0]).toMatchObject({
      href: "/calendar",
      label: "Calendario",
    })
    expect(MOBILE_NAV_ITEMS[0]).toMatchObject({
      href: "/calendar",
      label: "Calendario",
    })
  })

  it("does not expose the dashboard route", () => {
    const navItems: Array<{ href: string }> = [
      ...DESKTOP_NAV_ITEMS,
      ...MOBILE_NAV_ITEMS,
    ]

    expect(navItems.some((item) => item.href === "/dashboard")).toBe(false)
    expect(
      existsSync(path.join(repoRoot, "app/(authenticated)/dashboard/page.tsx"))
    ).toBe(false)
  })
})
