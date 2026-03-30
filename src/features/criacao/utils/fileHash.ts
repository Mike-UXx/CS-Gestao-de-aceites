/** Computes SHA-256 hash of a File using the Web Crypto API (no dependencies) */
export async function computeSha256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export const MAX_FILE_SIZE_MB = 10
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

export function validatePdfFile(file: File): string | null {
  if (file.type !== 'application/pdf') {
    return 'Apenas arquivos PDF são permitidos'
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `O arquivo excede o limite de ${MAX_FILE_SIZE_MB}MB. Selecione um PDF menor`
  }
  return null
}
