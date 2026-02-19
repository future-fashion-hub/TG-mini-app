import { useRef, useState } from 'react'
import { Box, Button, Card, Checkbox, Group, Stack, Text } from '@mantine/core'
import { IconBell, IconCalendar } from '@tabler/icons-react'
import dayjs from 'dayjs'
import { CSS } from '@dnd-kit/utilities'
import { useSortable } from '@dnd-kit/sortable'
import type { Task } from '../types/task'
import { getProgressFillColor, getTaskProgress, isTaskOverdue } from '../utils/date'
import { WaterCanvas } from './WaterCanvas'

interface TaskCardProps {
  task: Task
  onToggleComplete: (taskId: string) => void
  isDragOver?: boolean
  justDropped?: boolean
  onDropAnimationDone?: () => void
}

const priorityConfig = {
  low: { color: 'var(--mantine-color-teal-5)' },
  medium: { color: 'var(--mantine-color-yellow-6)' },
  high: { color: 'var(--mantine-color-red-6)' },
} as const

const DISAPPEAR_DURATION = 500

export const TaskCard = ({ task, onToggleComplete, isDragOver, justDropped, onDropAnimationDone }: TaskCardProps) => {
  const [isDisappearing, setIsDisappearing] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: {
      type: 'task',
      startDate: task.startDate,
    },
  })

  const handleToggle = () => {
    if (isDisappearing) return
    setIsDisappearing(true)
    timerRef.current = setTimeout(() => {
      onToggleComplete(task.id)
    }, DISAPPEAR_DURATION)
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 20 : 2,
  }

  const progress = getTaskProgress(task)
  const isOverdue = isTaskOverdue(task)
  const daysLeft = Math.max(0, dayjs(task.endDate).startOf('day').diff(dayjs().startOf('day'), 'day'))
  const fillColor = getProgressFillColor(progress)
  const visibleFill = isOverdue ? 100 : Math.max(20, progress)

  return (
    <Card
      ref={setNodeRef}
      withBorder
      shadow="sm"
      radius="md"
      p="sm"
      className={`task-card${isDisappearing ? ' task-card-disappear' : ''}`}
      style={{
        ...style,
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
        ...(isDisappearing ? { animationDuration: `${DISAPPEAR_DURATION}ms` } : {}),
      }}
      {...attributes}
      {...listeners}
    >
      <WaterCanvas
        progress={visibleFill}
        fillColor={fillColor}
        isOverdue={isOverdue}
        externalWobble={isDragOver && !isDragging}
        resetFill={justDropped}
        onFillDone={onDropAnimationDone}
      />

      <Stack gap={6} style={{ position: 'relative', zIndex: 1 }}>
        <Group justify="space-between" align="start" wrap="nowrap">
          <Text fw={600} size="sm" lineClamp={2} td={task.completed ? 'line-through' : 'none'}>
            {task.title}
          </Text>
          <Box
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              flex: '0 0 auto',
              marginTop: 4,
              backgroundColor: priorityConfig[task.priority].color,
            }}
            title={`priority-${task.priority}`}
          />
        </Group>

        {task.description ? (
          <Text size="xs" c="dimmed" lineClamp={2}>
            {task.description}
          </Text>
        ) : null}

        <Group justify="space-between" align="center">
          <Group gap={4}>
            <IconCalendar size={14} />
            <Text size="xs" c="dimmed">
              {task.startDate === task.endDate
                ? dayjs(task.startDate).format('DD.MM')
                : `${dayjs(task.startDate).format('DD.MM')} – ${dayjs(task.endDate).format('DD.MM')}`}
            </Text>
          </Group>
          <Text size="xs" c="dimmed">
            {daysLeft === 0 ? 'Сегодня' : `${daysLeft} дн.`}
          </Text>
        </Group>

        <Group justify="space-between" align="center">
          <Checkbox
            size="xs"
            checked={task.completed || isDisappearing}
            onChange={handleToggle}
            label="Выполнено"
          />
          <Button
            variant="subtle"
            size="compact-xs"
            leftSection={<IconBell size={14} />}
            onClick={(event) => {
              event.stopPropagation()
              alert('Уведомление будет отправлено')
            }}
          >
            Напомнить мне
          </Button>
        </Group>
      </Stack>
    </Card>
  )
}
