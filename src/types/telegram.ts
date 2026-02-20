export interface TelegramUser {
  id: number
  first_name?: string
  last_name?: string
  username?: string
}

export interface HapticFeedback {
  impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void
  notificationOccurred: (type: 'error' | 'success' | 'warning') => void
  selectionChanged: () => void
}

export interface TelegramWebApp {
  initDataUnsafe?: {
    user?: TelegramUser
  }
  HapticFeedback?: HapticFeedback
  colorScheme?: 'light' | 'dark'
  themeParams?: {
    bg_color?: string
  }
  ready?: () => void
  expand?: () => void
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp
    }
  }
}
