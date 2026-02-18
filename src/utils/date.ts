import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import type { Task } from '../types/task'

dayjs.extend(isoWeek)

export const DATE_FORMAT = 'YYYY-MM-DD'

export const formatISODate = (value: dayjs.ConfigType) => dayjs(value).format(DATE_FORMAT)

export const getWeekStart = (baseDate = dayjs()) => baseDate.startOf('isoWeek')

export const getWeekDays = (baseDate = dayjs()) => {
  const start = getWeekStart(baseDate)
  return Array.from({ length: 7 }).map((_, index) => {
    const date = start.add(index, 'day')
    return {
      index,
      key: formatISODate(date),
      date,
      label: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'][index],
    }
  })
}

export const getTaskDurationDays = (task: Task) => {
  const start = dayjs(task.startDate)
  const end = dayjs(task.endDate)
  return Math.max(1, end.diff(start, 'day') + 1)
}

export const getTaskProgress = (task: Task, now = dayjs()) => {
  const start = dayjs(task.progressStartDate ?? task.startDate)
  const end = dayjs(task.endDate)
  const deadlineDayStart = end.startOf('day')
  const nowDate = dayjs(now)

  if (nowDate.isSame(end, 'day') || nowDate.isAfter(end, 'day')) {
    return 100
  }

  const totalHours = Math.max(1, deadlineDayStart.diff(start.startOf('day'), 'hour', true))
  const hoursLeft = Math.max(0, deadlineDayStart.diff(nowDate, 'hour', true))
  const value = (1 - hoursLeft / totalHours) * 100
  return Math.min(100, Math.max(0, Math.round(value)))
}

export const getProgressFillColor = (progress: number) => {
  if (progress < 50) {
    return 'rgba(18, 184, 134, 0.32)'
  }

  if (progress < 80) {
    return 'rgba(250, 176, 5, 0.34)'
  }

  return 'rgba(250, 82, 82, 0.34)'
}

export const isTaskOverdue = (task: Task, now = dayjs()) =>
  !task.completed && now.isAfter(dayjs(task.endDate), 'day')

export const getTaskSpan = (task: Task, weekStart = getWeekStart()) => {
  const weekStartDate = dayjs(weekStart)
  const weekEndDate = weekStartDate.add(6, 'day')
  const start = dayjs(task.startDate)
  const end = dayjs(task.endDate)

  if (end.isBefore(weekStartDate, 'day') || start.isAfter(weekEndDate, 'day')) {
    return 0
  }

  const spanStart = start.isBefore(weekStartDate, 'day') ? weekStartDate : start
  const spanEnd = end.isAfter(weekEndDate, 'day') ? weekEndDate : end
  return Math.max(1, spanEnd.diff(spanStart, 'day') + 1)
}
