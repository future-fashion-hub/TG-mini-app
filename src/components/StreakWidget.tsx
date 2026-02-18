import { Card, Group, Stack, Text, ThemeIcon } from '@mantine/core'
import { IconFlame } from '@tabler/icons-react'

interface StreakWidgetProps {
  streak: number
}

export const StreakWidget = ({ streak }: StreakWidgetProps) => (
  <Card withBorder radius="lg" p="md">
    <Group justify="space-between" align="center">
      <Stack gap={2}>
        <Text fw={600} size="md">
          Текущий стрик
        </Text>
        <Text c="dimmed" size="sm">
          Увеличивается, если завершить хотя бы одну задачу сегодня
        </Text>
      </Stack>
      <Group gap="xs" align="center">
        <ThemeIcon variant="light" color="orange" size="lg" radius="md">
          <IconFlame size={16} />
        </ThemeIcon>
        <Text fw={700} size="xl" lh={1}>
          {streak}
        </Text>
      </Group>
    </Group>
  </Card>
)
