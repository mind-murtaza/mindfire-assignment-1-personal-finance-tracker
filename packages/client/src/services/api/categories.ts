import { http } from '../http'
import { createLogger } from '../../lib/logger'
import type { CategoryCreateInput, CategoryUpdateInput } from '../../lib/validation/category'

const log = createLogger('api:categories')

export interface Category {
  id: string
  name: string
  type: 'income' | 'expense'
  color: string
  icon: string
  isDefault?: boolean
  monthlyBudget?: number
}

type ListResponse = { success?: boolean; data?: Category[] }
type ItemResponse = { success?: boolean; data?: Category }

export async function listCategories(query?: { type?: 'income' | 'expense' }): Promise<Category[]> {
  log.debug('list', query)
  const res = await http.get<ListResponse>('/categories', { params: query })
  return res.data.data ?? []
}

export async function createCategory(payload: CategoryCreateInput): Promise<Category> {
  log.info('create')
  const res = await http.post<ItemResponse>('/categories', payload)
  if (!res.data.data) throw new Error('No category in response')
  return res.data.data
}

export async function updateCategory(id: string, payload: CategoryUpdateInput): Promise<Category> {
  log.info('update', id)
  const res = await http.patch<ItemResponse>(`/categories/${id}`, payload)
  if (!res.data.data) throw new Error('No category in response')
  return res.data.data
}

export async function deleteCategory(id: string): Promise<void> {
  log.warn('delete', id)
  await http.delete(`/categories/${id}`)
}


