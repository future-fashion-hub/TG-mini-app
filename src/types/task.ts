export type TaskPriority = 'low' | 'medium' | 'high'

export interface Task {
  id: string
  title: string
  description?: string
  priority: TaskPriority
  startDate: string
  progressStartDate?: string
  endDate: string
  completed: boolean
  order: number
  completedAt?: string
}

export interface NewTaskInput {
  title: string
  description?: string
  priority: TaskPriority
  startDate: string
  endDate: string
}
