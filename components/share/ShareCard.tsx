"use client"

import { WorkoutStoryCard } from "@/components/share/WorkoutStoryCard"
import { ensureStoryCardData } from "@/lib/share"
import type { ShareCardData } from "@/types/share"

export function ShareCard({ data, className }: { data: ShareCardData; className?: string }) {
  return <WorkoutStoryCard data={ensureStoryCardData(data)} className={className} />
}
