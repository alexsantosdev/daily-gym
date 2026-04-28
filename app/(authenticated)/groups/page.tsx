"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { GroupCard } from "@/components/groups/GroupCard"
import { CreateGroupForm } from "@/components/groups/CreateGroupForm"
import { JoinGroupForm } from "@/components/groups/JoinGroupForm"
import { PointsGuideCard } from "@/components/groups/PointsGuideCard"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { calculateGroupScore, type GroupMemberScore } from "@/lib/groupScore"
import { getDateRangeFromPreset } from "@/lib/date"
import { useAuth } from "@/hooks/useAuth"
import { getGroupActivities } from "@/services/groupActivityService"
import { createGroup, getGroupMembers, getUserGroups, joinGroupByInviteCode } from "@/services/groupService"
import type { Group } from "@/types/group"

interface GroupMeta {
  membersCount: number
  leader?: GroupMemberScore
}

export default function GroupsPage() {
  const { user } = useAuth()
  const [groups, setGroups] = useState<Group[]>([])
  const [groupMetaById, setGroupMetaById] = useState<Record<string, GroupMeta>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false)
  const [isSubmittingJoin, setIsSubmittingJoin] = useState(false)

  const loadGroupsForUser = useCallback(async (userId: string) => {
    setIsLoading(true)
    const nextGroups = await getUserGroups(userId)
    setGroups(nextGroups)

    const range = getDateRangeFromPreset("7d")
    const groupMetaEntries = await Promise.all(
      nextGroups.map(async (group) => {
        const [members, activities] = await Promise.all([
          getGroupMembers(group.id),
          getGroupActivities(group.id, {
            start: range.periodStart,
            end: range.periodEnd,
          }),
        ])
        const ranking = calculateGroupScore(activities, members)
        return [
          group.id,
          {
            membersCount: members.filter((member) => member.status === "active").length,
            leader: ranking[0],
          } satisfies GroupMeta,
        ] as const
      })
    )

    setGroupMetaById(Object.fromEntries(groupMetaEntries))
    setIsLoading(false)
  }, [])

  useEffect(() => {
    if (!user?.uid) {
      setGroups([])
      setGroupMetaById({})
      setIsLoading(false)
      return
    }

    void loadGroupsForUser(user.uid)
  }, [loadGroupsForUser, user?.uid])

  const groupsSorted = useMemo(
    () => [...groups].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [groups]
  )

  return (
    <div className="space-y-5">
      <PageHeader
        title="Competicao"
        description="Crie grupos, entre por codigo e acompanhe o placar semanal com seus amigos."
      />

      <div className="grid gap-3 md:grid-cols-2">
        <CreateGroupForm
          isSubmitting={isSubmittingCreate}
          onCreate={async (name, endDate) => {
            if (!user?.uid) {
              return
            }

            setIsSubmittingCreate(true)
            try {
              await createGroup({
                name,
                endDate,
                owner: {
                  userId: user.uid,
                  displayName: user.displayName,
                  email: user.email,
                  photoURL: user.photoURL,
                },
              })
              await loadGroupsForUser(user.uid)
            } finally {
              setIsSubmittingCreate(false)
            }
          }}
        />
        <JoinGroupForm
          isSubmitting={isSubmittingJoin}
          onJoin={async (inviteCode) => {
            if (!user?.uid) {
              return
            }

            setIsSubmittingJoin(true)
            try {
              await joinGroupByInviteCode(inviteCode, {
                userId: user.uid,
                displayName: user.displayName,
                email: user.email,
                photoURL: user.photoURL,
              })
              await loadGroupsForUser(user.uid)
            } finally {
              setIsSubmittingJoin(false)
            }
          }}
        />
      </div>

      <PointsGuideCard />

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-44" />
          <Skeleton className="h-44" />
          <Skeleton className="h-44" />
        </div>
      ) : groupsSorted.length === 0 ? (
        <Card className="border-border/70">
          <CardContent className="pt-5">
            <p className="text-sm text-muted-foreground">
              Voce ainda nao participa de grupos. Crie um novo grupo ou entre com um codigo.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {groupsSorted.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              membersCount={groupMetaById[group.id]?.membersCount ?? 0}
              leaderName={groupMetaById[group.id]?.leader?.name}
              leaderPoints={groupMetaById[group.id]?.leader?.totalPoints}
            />
          ))}
        </div>
      )}
    </div>
  )
}
