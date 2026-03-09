import { ActionIcon, Button, Collapse, Group, Modal, Select, Stack, Text, TextInput, Textarea } from '@mantine/core'
import { useForm } from '@mantine/form'
import { IconChevronDown, IconChevronUp } from '@tabler/icons-react'
import dayjs from 'dayjs'
import { useLayoutEffect, useState } from 'react'
import type { NewTaskInput, Task } from '../types/task'
import { DATE_FORMAT } from '../utils/date'

interface AddTaskModalProps {
  opened: boolean
  defaultDate: string
  initialTask?: Task | null
  onClose: () => void
  onSubmit: (payload: NewTaskInput) => void
}

export const AddTaskModal = ({ opened, defaultDate, initialTask, onClose, onSubmit }: AddTaskModalProps) => {
  const [expanded, setExpanded] = useState(false)

  const form = useForm<NewTaskInput>({
    initialValues: {
      title: '',
      description: '',
      priority: 'medium',
      startDate: '',
      endDate: '',
    },
    validate: {
      title: (value) => (value.trim().length < 2 ? 'Минимум 2 символа' : null),
      endDate: (value, values) => {
        if (!values.startDate || !value) return null
        return dayjs(value, DATE_FORMAT).isBefore(dayjs(values.startDate, DATE_FORMAT), 'day')
          ? 'Дедлайн не может быть раньше старта'
          : null
      },
    },
  })

  useLayoutEffect(() => {
    if (opened) {
      if (initialTask) {
        setExpanded(!!(initialTask.description || initialTask.startDate || initialTask.endDate || initialTask.priority !== 'medium'))
        form.setValues({
          title: initialTask.title,
          description: initialTask.description || '',
          priority: initialTask.priority,
          startDate: initialTask.startDate || '',
          endDate: initialTask.endDate || '',
        })
      } else {
        setExpanded(false)
        form.setValues({
          title: '',
          description: '',
          priority: 'medium',
          startDate: defaultDate || '',
          endDate: '',
        })
      }
    }
  }, [opened, defaultDate, initialTask])

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={initialTask ? 'Редактировать задачу' : 'Новая задача'}
      radius="lg"
      centered
    >
      <form
        onSubmit={form.onSubmit((values) => {
          const payload = {
            ...values,
            startDate: values.startDate || undefined,
            endDate: values.endDate || undefined,
          }
          onSubmit(payload)
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
            <Button type="submit">{initialTask ? 'Сохранить' : 'Добавить'}</Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
