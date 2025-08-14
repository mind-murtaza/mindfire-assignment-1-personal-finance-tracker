import { useEffect, useState } from 'react'
import Card from '../components/ui/Card'
import CategoryForm from '../components/categories/CategoryForm'
import CategoryList from '../components/categories/CategoryList'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { fetchCategories, createCategoryThunk, updateCategoryThunk, deleteCategoryThunk } from '../store/categorySlice'
import type { CategoryCreateInput, CategoryUpdateInput } from '../lib/validation/category'
import type { Category } from '../services/api/categories'
import Button from '../components/ui/Button'

export default function CategoriesPage() {
  const dispatch = useAppDispatch()
  const { byId, allIds, status } = useAppSelector((s) => s.categories)
  const items = allIds.map((id) => byId[id])
  const [message, setMessage] = useState<string | null>(null)
  const [messageType, setMessageType] = useState<'success' | 'warning' | 'error' | 'info' | null>(null)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)

  useEffect(() => {
    console.log('status', status)
    if (status === 'idle') {
      dispatch(fetchCategories({ type: undefined }))
    }
  }, [dispatch, status])

  async function onCreate(data: CategoryCreateInput | CategoryUpdateInput) {
    setMessage(null)
    const res = await dispatch(createCategoryThunk(data as CategoryCreateInput))
    if (createCategoryThunk.fulfilled.match(res)) {
      setMessage('Category created')
      setMessageType('success')
    } else {
      console.log(res)
      setMessage('Category Name with same type already exists')
      setMessageType('error')
    }
  }

  async function onEditSubmit(data: CategoryCreateInput | CategoryUpdateInput) {
    if (!editingCategory) return
    setMessage(null)
    const res = await dispatch(updateCategoryThunk({ id: editingCategory.id, payload: data as CategoryUpdateInput }))
    if (updateCategoryThunk.fulfilled.match(res)) {
      setMessage('Category updated')
      setMessageType('success')
      setEditingCategory(null)
    } else {
      setMessage('Failed to update category')
      setMessageType('error')
    }
  }

  function onEdit(category: Category) {
    setEditingCategory(category)
    setMessage(null)
  }

  function cancelEdit() {
    setEditingCategory(null)
    setMessage(null)
  }

  async function onDelete(id: string) {
    const name = byId[id]?.name ?? 'this category'
    const ok = window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)
    if (!ok) return
    const res = await dispatch(deleteCategoryThunk(id))
    if (deleteCategoryThunk.fulfilled.match(res)) {
      setMessage('Category deleted')
      setMessageType('info')
    } else {
      setMessage('Failed to delete category')
      setMessageType('error')
    }
  }

  return (
    <div className="container py-8 space-y-6">
      {message && (
        <div className={`rounded-md border p-3 shadow-sm border-${messageType}-200 bg-${messageType}-50 text-${messageType}-600`} role="status" aria-live="polite">{message}</div>
      )}

      {editingCategory ? (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-neutral-900">Edit category</h2>
            <Button variant="outline" onClick={cancelEdit}>Cancel</Button>
          </div>
          <CategoryForm 
            onSubmit={onEditSubmit} 
            initial={{
              name: editingCategory.name,
              type: editingCategory.type,
              parentId: null,
              color: editingCategory.color,
              icon: editingCategory.icon,
              isDefault: !!editingCategory.isDefault,
              monthlyBudget: editingCategory.monthlyBudget ?? 0,
            }}
            busy={status === 'loading'}
            isEditing={true} 
          />
        </Card>
      ) : (
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">Create category</h2>
          <CategoryForm onSubmit={onCreate} busy={status === 'loading'} />
        </Card>
      )}

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-neutral-900 mb-4">Your categories</h2>
        <CategoryList items={items} onEdit={(c) => onEdit(c)} onDelete={onDelete} />
      </Card>
    </div>
  )
}


