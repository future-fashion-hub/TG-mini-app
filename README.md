# Telegram Weekly Planner Mini App

Минималистичное Telegram Mini App на React + Vite для недельного планирования задач с визуальной анимацией приближения дедлайна.

## Стек

- React + Vite + TypeScript
- Mantine UI
- Zustand (persist в localStorage)
- dayjs
- @dnd-kit/core + @dnd-kit/sortable

## Функции

- Недельная сетка `Пн–Вс`
- Drag & Drop карточек задач между днями и внутри дня
- Многодневные задачи (карточка визуально растягивается на несколько столбцов)
- Прогресс-заливка карточки по формуле времени до дедлайна
- Статусы приоритета (`low | medium | high`) с цветовой индикацией
- Стрик выполненных дней (сохраняется в localStorage)
- Кнопка `Напомнить мне` (демо-alert)
- Интеграция с `window.Telegram.WebApp` (пользователь, тема, ready/expand)

## Локальный запуск

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```
