import { Group, Text, ThemeIcon } from '@mantine/core'
import { IconFlame } from '@tabler/icons-react'

interface StreakWidgetProps {
  streak: number
}

export const StreakWidget = ({ streak }: StreakWidgetProps) => (
  <Group gap={10} align="center">
    <ThemeIcon variant="light" color="orange" size="lg" radius="md">
      <IconFlame size={20} />
    </ThemeIcon>
    <Text fw={700} size="xl" lh={1}>
      {streak}
    </Text>
  </Group>
)
