import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AppNotification, NotificationType } from '@/types/notification'
import { generateId } from '@/utils/helpers'

const KEY = 'lawapp_notifications'

function load(): AppNotification[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as AppNotification[]) : []
  } catch {
    return []
  }
}

function save(items: AppNotification[]) {
  localStorage.setItem(KEY, JSON.stringify(items))
}

export const useNotificationStore = defineStore('notifications', () => {
  const items = ref<AppNotification[]>(load())

  function persist() {
    save(items.value)
  }

  const unreadCount = computed(() => items.value.filter((n) => !n.read).length)

  function getForUser(userId: string): AppNotification[] {
    return items.value
      .filter((n) => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  function push(data: {
    userId: string
    title: string
    body: string
    link: string
    type: NotificationType
  }) {
    items.value.unshift({
      id: generateId(),
      userId: data.userId,
      title: data.title,
      body: data.body,
      link: data.link,
      type: data.type,
      read: false,
      createdAt: new Date().toISOString(),
    })
    persist()
  }

  function pushToMany(
    userIds: string[],
    data: Omit<Parameters<typeof push>[0], 'userId'>
  ) {
    for (const userId of userIds) {
      push({ ...data, userId })
    }
  }

  function markRead(id: string) {
    const n = items.value.find((x) => x.id === id)
    if (n) {
      n.read = true
      persist()
    }
  }

  function markAllRead(userId: string) {
    for (const n of items.value) {
      if (n.userId === userId) n.read = true
    }
    persist()
  }

  return {
    items,
    unreadCount,
    getForUser,
    push,
    pushToMany,
    markRead,
    markAllRead,
  }
})
