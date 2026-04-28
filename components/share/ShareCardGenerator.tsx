"use client"

import { forwardRef } from "react"

import { ShareCard } from "@/components/share/ShareCard"
import type { ShareCardData } from "@/types/share"

export const ShareCardGenerator = forwardRef<HTMLDivElement, { data: ShareCardData }>(
  function ShareCardGenerator({ data }, ref) {
    return (
      <div ref={ref}>
        <ShareCard data={data} />
      </div>
    )
  }
)
