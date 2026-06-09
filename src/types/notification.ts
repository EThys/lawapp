export type NotificationType = 'presence' | 'evaluation' | 'correction' | 'info'

export interface AppNotification {
  id: string
  userId: string
  title: string
  body: string
  link: string
  type: NotificationType
  read: boolean
  createdAt: string
}
