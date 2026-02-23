import { ActionIcon, Button, Collapse, Group, Modal, Select, Stack, Text, TextInput, Textarea } from '@mantine/core'
import { useForm } from '@mantine/form'
import { IconChevronDown, IconChevronUp } from '@tabler/icons-react'
import dayjs from 'dayjs'
import { useState } from 'react'
import type { NewTaskInput } from '../types/task'
import { DATE_FORMAT, formatISODate } from '../utils/date'

interface AddTaskModalProps {
  opened: boolean
  defaultDate: string
  onClose: () => void
  onSubmit: (payload: NewTaskInput) => void
}

export const AddTaskModal = ({ opened, defaultDate, onClose, onSubmit }: AddTaskModalProps) => {
  const [expanded, setExpanded] = useState(false)

  const form = useForm<NewTaskInput>({
    initialValues: {
      title: '',
      description: '',
      priority: 'medium',
      startDate: defaultDate,
      endDate: defaultDate,
    },
    validate: {
      title: (value) => (value.trim().length < 2 ? 'Минимум 2 символа' : null),
      endDate: (value, values) =>
        dayjs(value, DATE_FORMAT).isBefore(dayjs(values.startDate, DATE_FORMAT), 'day')
          ? 'Дедлайн не может быть раньше старта'
          : null,
    },
  })

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Новая задача"
      radius="lg"
      centered
      onEnterTransitionEnd={() => {
        setExpanded(false)
        form.setValues({
          title: '',
          description: '',
          priority: 'medium',
          startDate: formatISODate(defaultDate),
          endDate: formatISODate(defaultDate),
        })
      }}
    >
      <form
        onSubmit={form.onSubmit((values) => {
          onSubmit(values)
          onClose()
        })}
      >
        <Stack>
          <TextInput
            label="Название"
            placeholder="Например: Подготовить релиз"
            required
            styles={{ label: { marginBottom: 6 } }}
            {...form.getInputProps('title')}
          />
          
          <Group justify="space-between" align="center" onClick={() => setExpanded(!expanded)} style={{ cursor: 'pointer' }}>
             <Text size="sm" c="dimmed">Дополнительные настройки</Text>
             <ActionIcon variant="subtle" color="gray">
               {expanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
             </ActionIcon>
          </Group>

          <Collapse in={expanded}>
            <Stack>
              <Textarea
                label="Описание"
                placeholder="Опционально"
                minRows={2}
                styles={{ label: { marginBottom: 6 } }}
                {...form.getInputProps('description')}
              />
              <Select
                label="Приоритет"
                data={[
                  { label: 'Low', value: 'low' },
                  { label: 'Medium', value: 'medium' },
                  { label: 'High', value: 'high' },
                ]}
                styles={{ label: { marginBottom: 6 } }}
                {...form.getInputProps('priority')}
              />
              <Group grow>
                <TextInput label="Старт" type="date" styles={{ label: { marginBottom: 6 } }} {...form.getInputProps('startDate')} />
                <TextInput label="Дедлайн" type="date" styles={{ label: { marginBottom: 6 } }} {...form.getInputProps('endDate')} />
              </Group>
            </Stack>
          </Collapse>
          
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit">Добавить</Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
