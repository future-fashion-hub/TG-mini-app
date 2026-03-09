import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { CollisionDetection, DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { Button, Container, Group, SimpleGrid, Stack, Title, ActionIcon, Modal, Text } from '@mantine/core'
import { IconPlus, IconArchive } from '@tabler/icons-react'
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
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [backlogOpened, setBacklogOpened] = useState(false)
  const [selectedDay, setSelectedDay] = useState(formatISODate(now))
  const [activeDragOverDay, setActiveDragOverDay] = useState<string | null>(null)
  const [justDroppedId, setJustDroppedId] = useState<string | null>(null)
  const [isDraggingFromBacklog, setIsDraggingFromBacklog] = useState(false)
  const [hasExitedBacklog, setHasExitedBacklog] = useState(false)
  const { hapticFeedback } = useTelegramWebApp()
  const { tasks, streak, addTask, editTask, toggleCompleted, moveTask, reorderInDay, rollIncompleteTasksToToday, checkStreakExpiry } = useTaskStore()
  const todayKey = formatISODate(now)

  const weekStart = getWeekStart(now)
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart])

  const tasksByDay = useMemo(() => {
    const grouped = new Map<string, Task[]>()

    weekDays.forEach((day) => {
      grouped.set(day.key, [])
    })
    grouped.set('backlog', [])

    tasks.forEach((task) => {
      if (task.completed) return
      
      if (task.startDate && grouped.has(task.startDate)) {
        grouped.get(task.startDate)?.push(task)
      } else {
        grouped.get('backlog')?.push(task)
      }
    })

    grouped.forEach((value, key) => {
      grouped.set(
        key,
        [...value].sort((a, b) => {
          if (a.order !== b.order) return a.order - b.order
          if (!a.endDate || !b.endDate) return 0
          return dayjs(a.endDate).diff(dayjs(b.endDate), 'day')
        }),
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
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
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

  const scrollToFirstDayWithTasks = useCallback(() => {
    for (const day of weekDays) {
      const tasksInDay = tasksByDay.get(day.key) ?? []
      if (tasksInDay.length > 0) {
        const el = document.getElementById(`day-col-${day.key}`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
        break
      }
    }
  }, [weekDays, tasksByDay])

  useEffect(() => {
    let lastTapTime = 0

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement
      // Ignore interactive elements
      if (target.closest('button, a, input, textarea, .mantine-ActionIcon-root, .mantine-Modal-root')) {
        return
      }
      
      const currentTime = new Date().getTime()
      const tapLength = currentTime - lastTapTime

      if (tapLength < 300 && tapLength > 0) {
        scrollToFirstDayWithTasks()
      }
      
      lastTapTime = currentTime
    }

    const handleDblClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('button, a, input, textarea, .mantine-ActionIcon-root, .mantine-Modal-root')) return
      scrollToFirstDayWithTasks()
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('dblclick', handleDblClick)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('dblclick', handleDblClick)
    }
  }, [scrollToFirstDayWithTasks])

  const handleDragStart = (event: DragStartEvent) => {
    hapticFeedback?.impactOccurred('medium')
    setActiveDragOverDay(null)
    const id = String(event.active.id)
    if (taskDayMap.get(id) === 'backlog') {
      setIsDraggingFromBacklog(true)
      setHasExitedBacklog(false)
    }
  }

  const handleDragMove = () => {
    // Distance logic removed in favor of customCollisionDetection
  }

  const handleDragOver = ({ over }: DragOverEvent) => {
    if (!over) {
      if (isDraggingFromBacklog) {
        setHasExitedBacklog(true)
      }
      setActiveDragOverDay(null)
      return
    }
    const overId = String(over.id)
    const targetDay = overId.startsWith('day-') ? overId.replace('day-', '') : (taskDayMap.get(overId) ?? null)

    if (isDraggingFromBacklog && targetDay !== 'backlog') {
      setHasExitedBacklog(true)
    }

    setActiveDragOverDay(targetDay)
  }

  const openAddTask = () => {
    setSelectedDay(todayKey)
    setEditingTask(null)
    setModalOpened(true)
  }

  const handleEditTaskClick = (task: Task) => {
    setEditingTask(task)
    setModalOpened(true)
  }

  const handleModalSubmit = (payload: any) => {
    if (editingTask) {
      editTask(editingTask.id, payload)
    } else {
      addTask(payload)
    }
  }

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveDragOverDay(null)
    setIsDraggingFromBacklog(false)
    setHasExitedBacklog(false)
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

    moveTask(activeId, targetDay === 'backlog' ? undefined : targetDay, targetIndex)
    reorderInDay(sourceDay, nextSource)
    reorderInDay(targetDay, nextTarget)
    setJustDroppedId(activeId)

    if (sourceDay === 'backlog' && targetDay !== 'backlog') {
      setBacklogOpened(false)
    }
  }

  const handleDragCancel = () => {
    setActiveDragOverDay(null)
    setIsDraggingFromBacklog(false)
    setHasExitedBacklog(false)
  }

  const customCollisionDetection: CollisionDetection = (args) => {
    if (isDraggingFromBacklog && !hasExitedBacklog && args.pointerCoordinates) {
      const modalEl = document.querySelector('.mantine-Modal-content')
      if (modalEl) {
        const rect = modalEl.getBoundingClientRect()
        const p = args.pointerCoordinates
        if (p.x >= rect.left && p.x <= rect.right && p.y >= rect.top && p.y <= rect.bottom) {
          const backlogDroppable = args.droppableContainers.find((c) => c.id === 'day-backlog')
          if (backlogDroppable) {
            return [{ id: 'day-backlog', data: backlogDroppable.data }]
          }
        }
      }
    }
    return pointerWithin(args)
  }

  const shouldHideBacklogUi = isDraggingFromBacklog && hasExitedBacklog

  return (
    <Container size="xl" py="md" px="sm">
      <Stack gap="md">
        <Group justify="space-between" align="center" wrap="nowrap">
          <div style={{ flex: 1 }}>
            <Title order={2} style={{ fontSize: '1.5rem', lineHeight: 1.2 }}>Weekly Manager</Title>
          </div>
          <Group gap={12} wrap="nowrap">
             <ActionIcon 
                variant="light" 
                color="blue" 
                size="xl" 
                radius="md" 
                style={{ width: 44, height: 44 }}
                onClick={() => setBacklogOpened(true)}
                aria-label="Backlog"
             >
               <IconArchive size={24} />
             </ActionIcon>
             <StreakWidget streak={streak} />
             <Button visibleFrom="sm" onClick={openAddTask} size="md">+ Задача</Button>
          </Group>
        </Group>

        <DndContext sensors={sensors} collisionDetection={customCollisionDetection} onDragStart={handleDragStart} onDragMove={handleDragMove} onDragOver={handleDragOver} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
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
                onEdit={handleEditTaskClick}
                isDragOver={activeDragOverDay === day.key}
                justDroppedId={justDroppedId}
                clearJustDropped={() => setJustDroppedId(null)}
              />
            ))}
          </SimpleGrid>

          <Modal 
            opened={backlogOpened} 
            onClose={() => setBacklogOpened(false)} 
            title={<Text fw={700} size="sm">Бэклог</Text>}
            radius="lg"
            centered
            keepMounted
            styles={{
              root: {
                pointerEvents: shouldHideBacklogUi ? 'none' : 'auto',
              },
              inner: {
                opacity: shouldHideBacklogUi ? 0 : 1,
                transition: 'opacity 0.2s ease',
              },
            }}
            overlayProps={{ 
              backgroundOpacity: shouldHideBacklogUi ? 0 : 0.55, 
              blur: shouldHideBacklogUi ? 0 : 3,
              transitionProps: { duration: 200 },
            }}
          >
            <DayColumn
              dayKey="backlog"
              dayLabel=""
              dayDate=""
              tasks={tasksByDay.get('backlog') ?? []}
              onToggleComplete={toggleCompleted}
              onEdit={handleEditTaskClick}
              isDragOver={activeDragOverDay === 'backlog'}
              variant="backlog"
              dropDisabled={shouldHideBacklogUi}
            />
          </Modal>
        </DndContext>
      </Stack>

      <AddTaskModal
        opened={modalOpened}
        defaultDate={selectedDay}
        initialTask={editingTask}
        onClose={() => {
          setModalOpened(false)
          setTimeout(() => setEditingTask(null), 300)
        }}
        onSubmit={handleModalSubmit}
      />

      <ActionIcon
        hiddenFrom="sm"
        className="fab-add"
        size={56}
        radius="xl"
        variant="filled"
        onClick={openAddTask}
        aria-label="Добавить задачу"
      >
        <IconPlus size={20} />
      </ActionIcon>
    </Container>
  )
}

export default App
