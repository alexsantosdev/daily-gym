"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/hooks/useAuth"
import { DEFAULT_AUTHENTICATED_ROUTE } from "@/lib/navigation"

export default function LoginPage() {
  const router = useRouter()
  const { user, isFirebaseReady, signInWithEmail, createAccount } = useAuth()

  const [isRegistering, setIsRegistering] = useState(false)
  const [displayName, setDisplayName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      router.replace(DEFAULT_AUTHENTICATED_ROUTE)
    }
  }, [router, user])

  if (!isFirebaseReady) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Firebase não configurado</CardTitle>
            <CardDescription>
              Configure as variáveis de ambiente do Firebase para habilitar
              autenticação.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.16),_transparent_60%)]" />
      <Card className="relative z-10 w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {isRegistering ? "Criar conta" : "Entrar no daily-gym"}
          </CardTitle>
          <CardDescription>
            App privado para treino, refeições, check-ins e evolução.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={async (event) => {
              event.preventDefault()
              setError(null)
              setIsSubmitting(true)

              try {
                if (isRegistering) {
                  await createAccount(email, password, displayName)
                } else {
                  await signInWithEmail(email, password)
                }

                router.replace(DEFAULT_AUTHENTICATED_ROUTE)
              } catch (nextError) {
                const message =
                  nextError instanceof Error
                    ? nextError.message
                    : "Erro ao autenticar"
                setError(message)
              } finally {
                setIsSubmitting(false)
              }
            }}
          >
            {isRegistering ? (
              <div className="space-y-2">
                <Label htmlFor="display-name">Nome</Label>
                <Input
                  id="display-name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  required
                />
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={
                  isRegistering ? "new-password" : "current-password"
                }
                required
                minLength={6}
              />
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting
                ? "Processando..."
                : isRegistering
                  ? "Criar conta"
                  : "Entrar"}
            </Button>
          </form>

          <Button
            type="button"
            variant="ghost"
            className="mt-3 w-full"
            onClick={() => setIsRegistering((prev) => !prev)}
          >
            {isRegistering ? "Já tenho conta" : "Criar nova conta"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
