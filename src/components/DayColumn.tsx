import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Card, Group, Stack, Text } from '@mantine/core'
import type { Task } from '../types/task'
import { TaskCard } from './TaskCard'

interface DayColumnProps {
  dayKey: string
  dayLabel: string
  dayDate: string
  tasks: Task[]
  onToggleComplete: (taskId: string) => void
  onEdit?: (task: Task) => void
  isDragOver?: boolean
  justDroppedId?: string | null
  clearJustDropped?: () => void
  variant?: 'default' | 'backlog'
  dropDisabled?: boolean
}

export const DayColumn = ({
  dayKey,
  dayLabel,
  dayDate,
  tasks,
  onToggleComplete,
  onEdit,
  isDragOver = false,
  justDroppedId,
  clearJustDropped,
  variant = 'default',
  dropDisabled = false,
}: DayColumnProps) => {
  const isBacklog = variant === 'backlog'
  const { setNodeRef } = useDroppable({
    id: `day-${dayKey}`,
    disabled: dropDisabled,
    data: {
      type: 'day',
      dayKey,
    },
  })

  return (
    <Card
      id={`day-col-${dayKey}`}
      ref={setNodeRef}
      withBorder={!isBacklog}
      radius="lg"
      p={isBacklog ? 0 : 'sm'}
      bg={isBacklog ? 'transparent' : undefined}
      shadow={isBacklog ? 'none' : undefined}
      style={{
        minHeight: 280,
        overflow: 'hidden',
        background: isDragOver ? 'rgba(0, 0, 0, 0.04)' : undefined,
        transition: 'background-color 200ms ease',
      }}
    >
      <Stack gap="sm">
        {!isBacklog && (
          <Group justify="space-between" align="start" wrap="nowrap">
            <Text fw={700} size="sm">
              {dayLabel}
            </Text>
            <Text size="xs" c="dimmed" ta="right">
              {dayDate}
            </Text>
          </Group>
        )}

        <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
          <Stack gap="xs">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggleComplete={onToggleComplete}
                onEdit={onEdit}
                isDragOver={isDragOver}
                justDropped={task.id === justDroppedId}
                onDropAnimationDone={task.id === justDroppedId ? clearJustDropped : undefined}
              />
            ))}
          </Stack>
        </SortableContext>
      </Stack>
    </Card>
  )
}
