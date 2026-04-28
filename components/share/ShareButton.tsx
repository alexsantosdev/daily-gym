"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import { ArrowSquareOut, DownloadSimple, X } from "@phosphor-icons/react"

import { ShareCardGenerator } from "@/components/share/ShareCardGenerator"
import { ShareCardPreview } from "@/components/share/ShareCardPreview"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  downloadShareImage,
  getShareFileName,
  getShareTitle,
  shareImage,
  applyWorkoutAnalysisToShareData,
} from "@/lib/share"
import { requestWorkoutShareAnalysis } from "@/services/workoutAIAnalysisService"
import { generateAIShareImagePlaceholder, generateHtmlShareImage } from "@/services/shareImageService"
import type { ShareCardData, ShareCardType } from "@/types/share"

export function ShareButton({
  cardType,
  data,
  label = "Compartilhar",
  size = "sm",
  variant = "outline",
}: {
  cardType: ShareCardType
  data: ShareCardData
  label?: string
  size?: "xs" | "sm" | "default" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg"
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive" | "link"
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isPreparing, setIsPreparing] = useState(false)
  const [resolvedData, setResolvedData] = useState<ShareCardData>(data)
  const previewCardRef = useRef<HTMLDivElement>(null)
  const generatorCardRef = useRef<HTMLDivElement>(null)
  const filename = useMemo(() => getShareFileName(cardType), [cardType])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    let isMounted = true

    async function prepareShareData() {
      setIsPreparing(true)
      setResolvedData(data)

      try {
        if (cardType === "workout" && data.workoutAnalysisPayload) {
          const analysis = await requestWorkoutShareAnalysis(data.workoutAnalysisPayload)
          if (isMounted) {
            const analyzedData = applyWorkoutAnalysisToShareData(data, analysis)
            void generateAIShareImagePlaceholder(analyzedData)
            setResolvedData(analyzedData)
          }
          return
        }

        if (isMounted) {
          setResolvedData(data)
        }
      } catch (error) {
        console.warn("Falha ao gerar analise de share card. Usando dados locais.", error)
        if (isMounted) {
          setResolvedData(data)
        }
      } finally {
        if (isMounted) {
          setIsPreparing(false)
        }
      }
    }

    void prepareShareData()

    return () => {
      isMounted = false
    }
  }, [cardType, data, isOpen])

  async function createImageBlob() {
    const targetElement = generatorCardRef.current ?? previewCardRef.current

    if (!targetElement) {
      throw new Error("Preview indisponivel para gerar imagem.")
    }

    setIsGenerating(true)
    try {
      return await generateHtmlShareImage(targetElement)
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleDownload() {
    const blob = await createImageBlob()
    downloadShareImage(blob, filename)
  }

  async function handleShare() {
    const blob = await createImageBlob()
    const shared = await shareImage(blob, getShareTitle(cardType), filename)

    if (!shared) {
      downloadShareImage(blob, filename)
    }
  }

  return (
    <>
      <Button type="button" size={size} variant={variant} onClick={() => setIsOpen(true)}>
        <ArrowSquareOut data-icon="inline-start" />
        {label}
      </Button>

      {isOpen ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-background/75 p-3 backdrop-blur-sm sm:items-center">
          <Card className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden border-border/70">
            <CardContent className="flex h-full flex-col gap-4 p-4">
              <div className="sticky top-0 z-10 flex items-center justify-between gap-2 bg-card">
                <p className="text-sm font-semibold">Preview de compartilhamento</p>
                <Button type="button" variant="outline" size="icon-sm" onClick={() => setIsOpen(false)}>
                  <X />
                </Button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto py-1">
                {isPreparing ? (
                  <div className="rounded-xl border border-border/70 bg-muted/30 px-3 py-6 text-center">
                    <p className="text-sm font-medium">Criando seu card...</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Estamos preparando um visual premium com base no seu treino real.
                    </p>
                  </div>
                ) : (
                  <ShareCardPreview data={resolvedData} cardRef={previewCardRef} />
                )}
              </div>

              <div className="grid grid-cols-1 gap-2 border-t border-border/60 pt-3 min-[390px]:grid-cols-2">
                <Button
                  type="button"
                  className="h-11"
                  onClick={() => void handleShare()}
                  disabled={isGenerating || isPreparing}
                >
                  <ArrowSquareOut data-icon="inline-start" />
                  {isGenerating ? "Gerando..." : "Compartilhar"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11"
                  onClick={() => void handleDownload()}
                  disabled={isGenerating || isPreparing}
                >
                  <DownloadSimple data-icon="inline-start" />
                  {isGenerating ? "Gerando..." : "Baixar imagem"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="pointer-events-none fixed -left-[9999px] -top-[9999px]">
        <ShareCardGenerator ref={generatorCardRef} data={resolvedData} />
      </div>
    </>
  )
}
