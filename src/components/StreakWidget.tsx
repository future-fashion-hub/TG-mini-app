import { Group, ThemeIcon, Title } from '@mantine/core'
import { IconFlame } from '@tabler/icons-react'

interface StreakWidgetProps {
  streak: number
}

export const StreakWidget = ({ streak }: StreakWidgetProps) => (
  <Group gap={10} align="center">
    <ThemeIcon variant="light" color="orange" size="xl" radius="md" style={{ width: 44, height: 44 }}>
      <IconFlame size={24} />
    </ThemeIcon>
    <Title order={2} style={{ fontSize: '1.5rem', lineHeight: 1.2 }}>
      {streak}
    </Title>
  </Group>
)
