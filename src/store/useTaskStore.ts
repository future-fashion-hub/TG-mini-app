import dayjs from 'dayjs'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import type { NewTaskInput, Task } from '../types/task'
import { formatISODate, getWeekStart } from '../utils/date'

const weekStart = getWeekStart()

interface TaskState {
  tasks: Task[]
  streak: number
  lastStreakDate: string | null
  addTask: (task: NewTaskInput) => void
  toggleCompleted: (taskId: string) => void
  moveTask: (taskId: string, startDate: string, order: number) => void
  reorderInDay: (day: string, orderedTaskIds: string[]) => void
  recalculateStreak: () => void
  rollIncompleteTasksToToday: () => void
  checkStreakExpiry: () => void
}

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      tasks: [],
      streak: 0,
      lastStreakDate: null,

      addTask: (taskInput) => {
        const sameDayTasks = get().tasks.filter((task) => task.startDate === taskInput.startDate)

        set((state) => ({
          tasks: [
            ...state.tasks,
            {
              id: uuidv4(),
              title: taskInput.title,
              description: taskInput.description,
              priority: taskInput.priority,
              startDate: taskInput.startDate,
              progressStartDate: taskInput.startDate,
              endDate: taskInput.endDate,
              completed: false,
              order: sameDayTasks.length,
            },
          ],
        }))
      },

      toggleCompleted: (taskId) => {
        const today = formatISODate(dayjs())
        const yesterday = formatISODate(dayjs().subtract(1, 'day'))

        set((state) => {
          const updatedTasks = state.tasks.map((task) => {
            if (task.id !== taskId) return task
            const nextCompleted = !task.completed
            return {
              ...task,
              completed: nextCompleted,
              completedAt: nextCompleted ? today : undefined,
            }
          })

          const hasCompletedToday = updatedTasks.some(
            (task) => task.completed && task.completedAt === today,
          )

          if (!hasCompletedToday || state.lastStreakDate === today) {
            return { tasks: updatedTasks }
          }

          return {
            tasks: updatedTasks,
            streak: state.lastStreakDate === yesterday ? state.streak + 1 : 1,
            lastStreakDate: today,
          }
        })
      },

      moveTask: (taskId, startDate, order) => {
        const targetTask = get().tasks.find((task) => task.id === taskId)
        if (!targetTask) {
          return
        }

        const durationDays = dayjs(targetTask.endDate).diff(dayjs(targetTask.startDate), 'day')

        set((state) => ({
          tasks: state.tasks.map((task) => {
            if (task.id !== taskId) return task

            return {
              ...task,
              startDate,
              progressStartDate: startDate,
              endDate: formatISODate(dayjs(startDate).add(durationDays, 'day')),
              order,
            }
          }),
        }))
      },

      reorderInDay: (day, orderedTaskIds) => {
        const orderMap = new Map(orderedTaskIds.map((taskId, index) => [taskId, index]))

        set((state) => ({
          tasks: state.tasks.map((task) => {
            if (task.startDate !== day) return task
            const order = orderMap.get(task.id)
            return typeof order === 'number' ? { ...task, order } : task
          }),
        }))
      },

      recalculateStreak: () => {
        const today = formatISODate(dayjs())
        const yesterday = formatISODate(dayjs().subtract(1, 'day'))
        const { tasks, lastStreakDate, streak } = get()

        const hasCompletedToday = tasks.some((task) => task.completed && task.completedAt === today)
        if (!hasCompletedToday || lastStreakDate === today) {
          return
        }

        set({
          streak: lastStreakDate === yesterday ? streak + 1 : 1,
          lastStreakDate: today,
        })
      },

      rollIncompleteTasksToToday: () => {
        const today = dayjs().startOf('day')
        const todayKey = formatISODate(today)

        set((state) => {
          let changed = false
          const dayOrders = new Map<string, number>()

          state.tasks.forEach((task) => {
            const nextOrder = dayOrders.get(task.startDate) ?? 0
            dayOrders.set(task.startDate, Math.max(nextOrder, task.order + 1))
          })

          const updatedTasks = state.tasks.map((task) => {
            if (task.completed) return task

            const taskStart = dayjs(task.startDate).startOf('day')
            const taskEnd = dayjs(task.endDate).startOf('day')
            const daysLeft = Math.max(0, taskEnd.diff(today, 'day'))
            const targetDate = formatISODate(taskEnd.subtract(daysLeft, 'day'))

            const shouldRoll =
              taskEnd.isSame(today, 'day') ||
              (taskStart.isBefore(today, 'day') && taskEnd.isAfter(today, 'day'))

            if (!shouldRoll || targetDate === task.startDate) return task

            changed = true
            const order = dayOrders.get(todayKey) ?? 0
            dayOrders.set(todayKey, order + 1)

            return {
              ...task,
              startDate: targetDate,
              order,
            }
          })

          if (!changed) {
            return state
          }

          return { tasks: updatedTasks }
        })
      },

      checkStreakExpiry: () => {
        const today = formatISODate(dayjs())
        const yesterday = formatISODate(dayjs().subtract(1, 'day'))
        const { lastStreakDate } = get()

        if (lastStreakDate && lastStreakDate !== today && lastStreakDate !== yesterday) {
          set({ streak: 0, lastStreakDate: null })
        }
      },
    }),
    {
      name: 'tg-weekly-planner-storage',
      version: 4,
      partialize: (state) => ({
        tasks: state.tasks,
        streak: state.streak,
        lastStreakDate: state.lastStreakDate,
      }),
    },
  ),
)
