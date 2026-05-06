"use client"

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  indexedDBLocalPersistence,
  inMemoryPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type Auth,
  type User,
} from "firebase/auth"

import { assertFirebaseConfigured, isFirebaseConfigured } from "@/lib/firebase"

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  isFirebaseReady: boolean
  signInWithEmail: (email: string, password: string) => Promise<void>
  createAccount: (email: string, password: string, displayName: string) => Promise<void>
  signOutUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

async function configureAuthPersistence(auth: Auth) {
  const candidates = [
    indexedDBLocalPersistence,
    browserLocalPersistence,
    browserSessionPersistence,
    inMemoryPersistence,
  ]

  for (const candidate of candidates) {
    try {
      await setPersistence(auth, candidate)
      return
    } catch {
      continue
    }
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setIsLoading(false)
      return
    }

    const { auth } = assertFirebaseConfigured()
    let didCancel = false
    let unsubscribe: (() => void) | null = null

    const bootstrapAuth = async () => {
      try {
        await configureAuthPersistence(auth)
      } finally {
        if (didCancel) {
          return
        }

        unsubscribe = onAuthStateChanged(auth, (nextUser) => {
          setUser(nextUser)
          setIsLoading(false)
        })
      }
    }

    void bootstrapAuth()

    return () => {
      didCancel = true
      unsubscribe?.()
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isFirebaseReady: isFirebaseConfigured,
      async signInWithEmail(email, password) {
        const { auth } = assertFirebaseConfigured()
        await signInWithEmailAndPassword(auth, email, password)
      },
      async createAccount(email, password, displayName) {
        const { auth } = assertFirebaseConfigured()
        const credentials = await createUserWithEmailAndPassword(auth, email, password)

        if (displayName.trim()) {
          await updateProfile(credentials.user, {
            displayName,
          })
        }
      },
      async signOutUser() {
        const { auth } = assertFirebaseConfigured()
        await signOut(auth)
      },
    }),
    [isLoading, user]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }

  return context
}
