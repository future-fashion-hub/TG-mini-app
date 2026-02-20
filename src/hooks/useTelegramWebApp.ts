import { useEffect, useState } from 'react'
import type { TelegramUser } from '../types/telegram'

export const useTelegramWebApp = () => {
  const [user, setUser] = useState<TelegramUser | null>(null)
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const webApp = window.Telegram?.WebApp

    if (!webApp) {
      return
    }

    if (webApp.initDataUnsafe?.user) {
      setUser(webApp.initDataUnsafe.user)
    }

    webApp.ready?.()
    webApp.expand?.()

    if (webApp.colorScheme === 'dark' || webApp.colorScheme === 'light') {
      setColorScheme(webApp.colorScheme)
    }

    if (webApp.themeParams?.bg_color) {
      document.body.style.backgroundColor = webApp.themeParams.bg_color
    }
  }, [])

  return {
    user,
    colorScheme,
    isTelegram: Boolean(window.Telegram?.WebApp),
    hapticFeedback: window.Telegram?.WebApp?.HapticFeedback,
    webApp: window.Telegram?.WebApp,
  }
}

