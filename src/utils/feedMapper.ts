import type {
  ContenuEntity,
  StatusPost,
  CommentaireContenuEntity,
  LikeContenusEntity,
} from '@/api/types'
import type { LegalFeedItem, LegalComment } from '@/data/legalFeed'

function firstSentence(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return ''
  const match = trimmed.match(/^[^.!?]+[.!?]?/)
  return match?.[0]?.trim() || trimmed.slice(0, 120)
}

function mapComment(c: CommentaireContenuEntity, author = 'Utilisateur'): LegalComment {
  return {
    id: String(c.id),
    apiId: c.id,
    author,
    text: c.description,
    createdAt: c.createdAt ?? new Date().toISOString(),
  }
}

export function buildFeedFromApi(data: {
  contenus: ContenuEntity[]
  statuses: StatusPost[]
  commentaires: CommentaireContenuEntity[]
  likes: LikeContenusEntity[]
}): LegalFeedItem[] {
  const likeCountByContenu = new Map<number, number>()
  for (const like of data.likes) {
    if (like.like === false) continue
    likeCountByContenu.set(like.contenuId, (likeCountByContenu.get(like.contenuId) ?? 0) + 1)
  }

  const commentsByContenu = new Map<number, LegalComment[]>()
  for (const c of data.commentaires) {
    const list = commentsByContenu.get(c.contenuId) ?? []
    list.push(mapComment(c))
    commentsByContenu.set(c.contenuId, list)
  }

  const fromContenu: LegalFeedItem[] = data.contenus
    .filter((c) => c.active !== false)
    .map((c) => {
      const description = c.description?.trim() || c.title
      return {
        id: `c-${c.id}`,
        apiContenuId: c.id,
        kind: 'contenu' as const,
        category: 'Juridique',
        title: c.title,
        hook: firstSentence(description) || c.title,
        content: description,
        audience: 'Tous publics' as const,
        likes: likeCountByContenu.get(c.id) ?? 0,
        comments: commentsByContenu.get(c.id) ?? [],
      }
    })

  const fromStatus: LegalFeedItem[] = data.statuses
    .filter((s) => s.active !== false && s.note?.trim())
    .map((s) => ({
      id: `s-${s.id}`,
      kind: 'status' as const,
      category: 'Story',
      title: 'Note juridique',
      hook: s.note.length > 80 ? `${s.note.slice(0, 77)}…` : s.note,
      content: s.note,
      audience: 'Tous publics' as const,
      likes: 0,
      comments: [],
      backgroundColor: s.backgroundColor,
    }))

  return [...fromStatus, ...fromContenu].sort((a, b) => {
    if (a.kind === 'status' && b.kind !== 'status') return -1
    if (b.kind === 'status' && a.kind !== 'status') return 1
    return 0
  })
}
