import { env } from './env'

// ============================================================
// SUPABASE STORAGE — PREPARAÇÃO
// ============================================================
// Este módulo encapsula o acesso ao Supabase Storage.
// Quando ativado, substitui uploads locais por uploads no bucket S3 do Supabase.
//
// Buckets planejados:
//   - "avatars"       → fotos de perfil dos jogadores
//   - "match-proofs"  → provas de resultado de partidas (prints, replays)
//   - "banners"       → banners de torneios
//
// Para ativar:
//   1. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env
//   2. Crie os buckets no painel Supabase (Storage → New bucket)
//   3. Configure políticas de acesso (RLS) nos buckets
// ============================================================

interface UploadResult {
  path: string
  publicUrl: string
}

const BUCKETS = {
  AVATARS: 'avatars',
  MATCH_PROOFS: 'match-proofs',
  BANNERS: 'banners',
} as const

type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS]

/**
 * Verifica se o Supabase Storage está configurado.
 */
export function isStorageConfigured(): boolean {
  return !!(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY)
}

/**
 * Faz upload de um arquivo para o Supabase Storage.
 *
 * Requer: npm install @supabase/supabase-js
 *
 * Exemplo de uso futuro:
 *   const result = await uploadFile('avatars', 'user-123/avatar.png', buffer, 'image/png')
 */
export async function uploadFile(
  bucket: BucketName,
  filePath: string,
  fileBuffer: Buffer,
  contentType: string
): Promise<UploadResult> {
  if (!isStorageConfigured()) {
    throw new Error('Supabase Storage não configurado. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.')
  }

  // Import dinâmico — não quebra se @supabase/supabase-js não estiver instalado
  // @ts-ignore - módulo opcional, instalar com: npm install @supabase/supabase-js
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, fileBuffer, {
      contentType,
      upsert: true,
    })

  if (error) {
    throw new Error(`Erro no upload (${bucket}/${filePath}): ${error.message}`)
  }

  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path)

  return {
    path: data.path,
    publicUrl: urlData.publicUrl,
  }
}

/**
 * Remove um arquivo do Supabase Storage.
 */
export async function deleteFile(bucket: BucketName, filePath: string): Promise<void> {
  if (!isStorageConfigured()) return

  // @ts-ignore - módulo opcional, instalar com: npm install @supabase/supabase-js
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

  const { error } = await supabase.storage
    .from(bucket)
    .remove([filePath])

  if (error) {
    console.error(`Erro ao deletar ${bucket}/${filePath}:`, error.message)
  }
}

export { BUCKETS }
export type { BucketName, UploadResult }
