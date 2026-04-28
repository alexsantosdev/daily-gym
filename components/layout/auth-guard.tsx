"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"

import { useAuth } from "@/hooks/useAuth"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isLoading, isFirebaseReady } = useAuth()

  useEffect(() => {
    if (isLoading) {
      return
    }

    if (!isFirebaseReady) {
      return
    }

    if (!user && pathname !== "/login") {
      router.replace("/login")
    }
  }, [isFirebaseReady, isLoading, pathname, router, user])

  if (!isFirebaseReady) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-md rounded-xl border border-border bg-card p-6 text-center">
          <h2 className="text-lg font-semibold">Firebase não configurado</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Preencha as variáveis `NEXT_PUBLIC_FIREBASE_*` para habilitar login e dados.
          </p>
        </div>
      </div>
    )
  }

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Carregando sua área...</p>
      </div>
    )
  }

  return <>{children}</>
}
