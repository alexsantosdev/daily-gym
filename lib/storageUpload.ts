import { getDownloadURL, ref, type FirebaseStorage, uploadBytes } from "firebase/storage"

type UploadErrorLike = {
  code?: string
  message?: string
  customData?: { serverResponse?: string }
}

export function buildStorageUploadErrorMessage(
  error: unknown,
  bucketName?: string,
  entityLabel = "arquivo"
) {
  const maybeError = error as UploadErrorLike
  const serverResponse = maybeError?.customData?.serverResponse
  const baseMessage = maybeError?.message || `Falha ao enviar ${entityLabel} para o Firebase Storage.`

  if (serverResponse) {
    return `Upload de ${entityLabel} falhou. Bucket: ${bucketName ?? "-"}. Resposta: ${serverResponse}`
  }

  if (maybeError?.code) {
    return `Upload de ${entityLabel} falhou (${maybeError.code}). Verifique bucket e regras do Firebase Storage.`
  }

  return baseMessage
}

export function buildImageFileName(file: File) {
  const extensionRaw = file.name.split(".").pop() || "jpg"
  const extension = extensionRaw.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg"
  return `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`
}

export async function uploadImageWithFallbackPaths(input: {
  storage: FirebaseStorage
  file: File
  candidatePaths: string[]
  entityLabel: string
}) {
  const { storage, file, candidatePaths, entityLabel } = input
  const contentType = file.type || "image/jpeg"
  const bucketName = storage.app.options.storageBucket
  let lastError: unknown

  for (const path of candidatePaths) {
    try {
      const fileRef = ref(storage, path)
      await uploadBytes(fileRef, file, { contentType })
      return getDownloadURL(fileRef)
    } catch (error) {
      lastError = error
    }
  }

  throw new Error(buildStorageUploadErrorMessage(lastError, bucketName, entityLabel))
}
