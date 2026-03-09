import { Group, Text, ThemeIcon } from '@mantine/core'
import { IconFlame } from '@tabler/icons-react'

interface StreakWidgetProps {
  streak: number
}

export const StreakWidget = ({ streak }: StreakWidgetProps) => (
  <Group gap={10} align="center">
    <ThemeIcon variant="light" color="orange" size="xl" radius="md" style={{ width: 44, height: 44 }}>
      <IconFlame size={24} />
    </ThemeIcon>
    <Text fw={800} fz={24} lh={1}>
      {streak}
    </Text>
  </Group>
)
