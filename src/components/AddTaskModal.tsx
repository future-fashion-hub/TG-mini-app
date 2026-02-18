import { Button, Group, Modal, Select, Stack, TextInput, Textarea } from '@mantine/core'
import { useForm } from '@mantine/form'
import dayjs from 'dayjs'
import type { NewTaskInput } from '../types/task'
import { DATE_FORMAT, formatISODate } from '../utils/date'

interface AddTaskModalProps {
  opened: boolean
  defaultDate: string
  onClose: () => void
  onSubmit: (payload: NewTaskInput) => void
}

export const AddTaskModal = ({ opened, defaultDate, onClose, onSubmit }: AddTaskModalProps) => {
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
          <TextInput label="Название" placeholder="Например: Подготовить релиз" required {...form.getInputProps('title')} />
          <Textarea label="Описание" placeholder="Опционально" minRows={2} {...form.getInputProps('description')} />
          <Select
            label="Приоритет"
            data={[
              { label: 'Low', value: 'low' },
              { label: 'Medium', value: 'medium' },
              { label: 'High', value: 'high' },
            ]}
            {...form.getInputProps('priority')}
          />
          <Group grow>
            <TextInput label="Старт" type="date" {...form.getInputProps('startDate')} />
            <TextInput label="Дедлайн" type="date" {...form.getInputProps('endDate')} />
          </Group>
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
