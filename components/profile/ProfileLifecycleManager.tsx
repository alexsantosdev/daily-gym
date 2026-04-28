"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

import { UserCircle } from "@phosphor-icons/react"

import { MonthlyCheckinDrawer } from "@/components/profile/MonthlyCheckinDrawer"
import { ProfileOnboardingDrawer } from "@/components/profile/ProfileOnboardingDrawer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/hooks/useAuth"
import {
  getCurrentMonthCheckin,
  shouldRequestMonthlyCheckin,
} from "@/services/monthlyCheckinService"
import { getUserProfile, shouldShowOnboarding } from "@/services/profileService"
import type { UserMonthlyCheckin, UserProfile } from "@/types/profile"

export function ProfileLifecycleManager() {
  const { user } = useAuth()
  const [isChecking, setIsChecking] = useState(true)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [currentCheckin, setCurrentCheckin] = useState<UserMonthlyCheckin | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showMonthlyCheckin, setShowMonthlyCheckin] = useState(false)
  const [onboardingPending, setOnboardingPending] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadProfileState() {
      if (!user?.uid) {
        if (isMounted) {
          setIsChecking(false)
          setProfile(null)
          setCurrentCheckin(null)
          setOnboardingPending(false)
        }
        return
      }

      setIsChecking(true)

      try {
        const [loadedProfile, shouldOnboard, monthCheckin, shouldAskMonthly] = await Promise.all([
          getUserProfile(user.uid),
          shouldShowOnboarding(user.uid),
          getCurrentMonthCheckin(user.uid),
          shouldRequestMonthlyCheckin(user.uid),
        ])

        if (!isMounted) {
          return
        }

        setProfile(loadedProfile)
        setCurrentCheckin(monthCheckin)
        setOnboardingPending(shouldOnboard)
        setShowOnboarding(shouldOnboard)
        setShowMonthlyCheckin(!shouldOnboard && shouldAskMonthly)
      } finally {
        if (isMounted) {
          setIsChecking(false)
        }
      }
    }

    void loadProfileState()

    return () => {
      isMounted = false
    }
  }, [user?.uid])

  const defaultDisplayName = useMemo(
    () => user?.displayName || user?.email?.split("@")[0] || "Atleta",
    [user?.displayName, user?.email]
  )

  if (!user?.uid) {
    return null
  }

  return (
    <>
      <ProfileOnboardingDrawer
        open={showOnboarding}
        userId={user.uid}
        defaultDisplayName={defaultDisplayName}
        initialProfile={profile}
        onOpenChange={setShowOnboarding}
        onCompleted={(savedProfile) => {
          setProfile(savedProfile)
          setOnboardingPending(false)
          setShowOnboarding(false)
          void shouldRequestMonthlyCheckin(user.uid).then((needMonthly) => {
            if (needMonthly) {
              setShowMonthlyCheckin(true)
            }
          })
        }}
      />

      <MonthlyCheckinDrawer
        open={showMonthlyCheckin}
        userId={user.uid}
        initial={currentCheckin}
        defaultWeightKg={profile?.weightKg}
        onOpenChange={setShowMonthlyCheckin}
        onSaved={(savedCheckin) => {
          setCurrentCheckin(savedCheckin)
          setShowMonthlyCheckin(false)
        }}
      />

      {!isChecking && onboardingPending && !showOnboarding ? (
        <div className="fixed bottom-[calc(6.75rem+env(safe-area-inset-bottom))] left-3 z-30 md:bottom-6 md:left-6">
          <Card className="border-primary/30 bg-card/95 shadow-sm backdrop-blur">
            <CardContent className="flex items-center gap-2 px-3 py-2">
              <Badge variant="secondary" className="gap-1">
                <UserCircle className="size-3.5" />
                Perfil pendente
              </Badge>
              <Button type="button" size="sm" onClick={() => setShowOnboarding(true)}>
                Completar
              </Button>
              <Button type="button" size="sm" variant="outline" asChild>
                <Link href="/profile">Abrir perfil</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </>
  )
}
