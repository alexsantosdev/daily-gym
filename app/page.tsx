import { redirect } from "next/navigation"

import { DEFAULT_AUTHENTICATED_ROUTE } from "@/lib/navigation"

export default function HomePage() {
  redirect(DEFAULT_AUTHENTICATED_ROUTE)
}
