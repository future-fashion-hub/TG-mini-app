import { useEffect, useMemo, useState } from 'react'
import './App.css'
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  rectIntersection,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { Button, Container, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core'
import dayjs from 'dayjs'
import { AddTaskModal } from './components/AddTaskModal'
import { DayColumn } from './components/DayColumn'
import { StreakWidget } from './components/StreakWidget'
import { useTelegramWebApp } from './hooks/useTelegramWebApp'
import { useTaskStore } from './store/useTaskStore'
import type { Task } from './types/task'
import { formatISODate, getWeekDays, getWeekStart } from './utils/date'
import { waterTilt } from './utils/waterTilt'

const DAY_GAP_PX = 12

function App() {
  const [now, setNow] = useState(dayjs())
  const [modalOpened, setModalOpened] = useState(false)
  const [selectedDay, setSelectedDay] = useState(formatISODate(now))
  const [activeDragOverDay, setActiveDragOverDay] = useState<string | null>(null)
  const [justDroppedId, setJustDroppedId] = useState<string | null>(null)
  const { user, isTelegram } = useTelegramWebApp()
  const { tasks, streak, addTask, toggleCompleted, moveTask, reorderInDay, rollIncompleteTasksToToday, checkStreakExpiry } = useTaskStore()
  const todayKey = formatISODate(now)

  const weekStart = getWeekStart(now)
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart])

  const tasksByDay = useMemo(() => {
    const grouped = new Map<string, Task[]>()

    weekDays.forEach((day) => {
      grouped.set(day.key, [])
    })

    tasks.forEach((task) => {
      if (task.completed) return
      if (!grouped.has(task.startDate)) return
      grouped.get(task.startDate)?.push(task)
    })

    grouped.forEach((value, key) => {
      grouped.set(
        key,
        [...value].sort((a, b) => a.order - b.order || dayjs(a.endDate).diff(dayjs(b.endDate), 'day')),
      )
    })

    return grouped
  }, [tasks, weekDays])

  const taskDayMap = useMemo(() => {
    const mapping = new Map<string, string>()
    tasksByDay.forEach((dayTasks, day) => {
      dayTasks.forEach((task) => mapping.set(task.id, day))
    })
    return mapping
  }, [tasksByDay])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 120,
        tolerance: 5,
      },
    }),
  )

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(dayjs())
    }, 60000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

  useEffect(() => {
    rollIncompleteTasksToToday()
    checkStreakExpiry()
  }, [rollIncompleteTasksToToday, checkStreakExpiry, todayKey])

  useEffect(() => {
    let targetTilt = 0
    let currentTilt = 0
    let targetBoost = 0
    let currentBoost = 0
    let animationFrameId = 0
    let previousGamma = 0

    const animate = () => {
      currentTilt += (targetTilt - currentTilt) * 0.12
      currentBoost += (targetBoost - currentBoost) * 0.15
      targetBoost *= 0.94

      // feed the shared state that every WaterCanvas reads each frame
      waterTilt.value = currentTilt
      waterTilt.boost = currentBoost

      animationFrameId = window.requestAnimationFrame(animate)
    }

    animationFrameId = window.requestAnimationFrame(animate)

    const handleOrientation = (event: DeviceOrientationEvent) => {
      const gamma = event.gamma ?? 0
      const clampedGamma = Math.max(-35, Math.min(35, gamma))
      targetTilt = Number((clampedGamma / 35) * 10)

      const delta = Math.abs(clampedGamma - previousGamma)
      const impulse = Math.min(1, delta / 18)
      targetBoost = Math.max(targetBoost, impulse)
      previousGamma = clampedGamma
    }

    window.addEventListener('deviceorientation', handleOrientation)

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation)
      window.cancelAnimationFrame(animationFrameId)
      waterTilt.value = 0
      waterTilt.boost = 0
    }
  }, [])

  const handleDragStart = (_event: DragStartEvent) => {
    setActiveDragOverDay(null)
  }

  const handleDragOver = ({ over }: DragOverEvent) => {
    if (!over) {
      setActiveDragOverDay(null)
      return
    }
    const overId = String(over.id)
    const targetDay = overId.startsWith('day-') ? overId.replace('day-', '') : (taskDayMap.get(overId) ?? null)

    setActiveDragOverDay(targetDay)
  }

  const openAddTask = () => {
    setSelectedDay(todayKey)
    setModalOpened(true)
  }

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveDragOverDay(null)
    if (!over) return

    const activeId = String(active.id)
    const sourceDay = taskDayMap.get(activeId)
    if (!sourceDay) return

    const overId = String(over.id)
    const targetDay = overId.startsWith('day-') ? overId.replace('day-', '') : taskDayMap.get(overId)
    if (!targetDay) return

    const sourceIds = (tasksByDay.get(sourceDay) ?? []).map((task) => task.id)
    const targetIds = (tasksByDay.get(targetDay) ?? []).map((task) => task.id)
    const sourceIndex = sourceIds.indexOf(activeId)

    if (sourceIndex < 0) return

    const overIndex = overId.startsWith('day-') ? targetIds.length : targetIds.indexOf(overId)
    const targetIndex = overIndex < 0 ? targetIds.length : overIndex

    if (sourceDay === targetDay) {
      if (sourceIndex === targetIndex || sourceIndex === targetIndex - 1) return
      const nextOrder = arrayMove(sourceIds, sourceIndex, targetIndex)
      reorderInDay(sourceDay, nextOrder)
      setJustDroppedId(activeId)
      return
    }

    const nextSource = sourceIds.filter((taskId) => taskId !== activeId)
    const nextTarget = [...targetIds]
    nextTarget.splice(targetIndex, 0, activeId)

    moveTask(activeId, targetDay, targetIndex)
    reorderInDay(sourceDay, nextSource)
    reorderInDay(targetDay, nextTarget)
    setJustDroppedId(activeId)
  }

  return (
    <Container size="xl" py="md" px="sm">
      <Stack gap="md">
        <Group justify="space-between" align="start">
          <div>
            <Title order={2}>Weekly Planner Mini App</Title>
            <Text c="dimmed" size="sm">
              {isTelegram
                ? `Привет, ${user?.first_name || user?.username || 'друг'}! План на неделю готов.`
                : 'Telegram WebApp не обнаружен. Режим локальной разработки.'}
            </Text>
          </div>
          <Button onClick={openAddTask}>+ Добавить задачу</Button>
        </Group>

        <StreakWidget streak={streak} />

        <DndContext sensors={sensors} collisionDetection={rectIntersection} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
          <SimpleGrid
            cols={{ base: 1, xs: 2, sm: 2, md: 3, lg: 7 }}
            spacing={DAY_GAP_PX}
            verticalSpacing="md"
            className="week-grid"
          >
            {weekDays.map((day) => (
              <DayColumn
                key={day.key}
                dayKey={day.key}
                dayLabel={day.label}
                dayDate={day.date.format('DD.MM')}
                tasks={tasksByDay.get(day.key) ?? []}
                onToggleComplete={toggleCompleted}
                isDragOver={activeDragOverDay === day.key}
                justDroppedId={justDroppedId}
                clearJustDropped={() => setJustDroppedId(null)}
              />
            ))}
          </SimpleGrid>
        </DndContext>
      </Stack>

      <AddTaskModal
        opened={modalOpened}
        defaultDate={selectedDay}
        onClose={() => setModalOpened(false)}
        onSubmit={addTask}
      />
    </Container>
  )
}

export default App
