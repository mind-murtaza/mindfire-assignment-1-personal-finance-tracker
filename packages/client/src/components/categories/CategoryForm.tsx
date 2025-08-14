import { useState, useEffect } from 'react'
import Input from '../ui/Input'
import Button from '../ui/Button'
import IconPicker from './IconPicker'
import { createCategorySchema, updateCategorySchema, type CategoryCreateInput, type CategoryUpdateInput } from '../../lib/validation/category'
import type { IconKey } from '../../lib/utils/icons'

interface Props {
  onSubmit: (data: CategoryCreateInput | CategoryUpdateInput) => void
  initial?: Partial<CategoryCreateInput>
  busy?: boolean
  isEditing?: boolean
}

export default function CategoryForm({ onSubmit, initial, busy, isEditing = false }: Props) {
  const [form, setForm] = useState<CategoryCreateInput>({
    name: initial?.name ?? '',
    type: initial?.type ?? 'expense',
    parentId: null,
    color: initial?.color ?? '#CCCCCC',
    icon: (initial?.icon as IconKey) ?? 'tag',
    isDefault: initial?.isDefault ?? false,
    monthlyBudget: initial?.monthlyBudget ?? 0,
  })
  const [errors, setErrors] = useState<Partial<Record<keyof CategoryCreateInput, string>>>({})

  // Update form when initial prop changes (for edit mode)
  useEffect(() => {
    setForm({
      name: initial?.name ?? '',
      type: initial?.type ?? 'expense',
      parentId: null,
      color: initial?.color ?? '#CCCCCC',
      icon: (initial?.icon as IconKey) ?? 'tag',
      isDefault: initial?.isDefault ?? false,
      monthlyBudget: initial?.monthlyBudget ?? 0,
    })
    setErrors({}) // Clear any existing errors when switching modes
  }, [initial])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})
    
    if (isEditing) {
      // For editing, only send editable fields (no type, no parentId)
      const updateData = {
        name: form.name,
        color: form.color,
        icon: form.icon,
        isDefault: form.isDefault,
        monthlyBudget: form.monthlyBudget,
      }
      const parsed = updateCategorySchema.safeParse(updateData)
      if (!parsed.success) {
        const fe = parsed.error.flatten().fieldErrors
        setErrors({
          name: fe.name?.[0],
          color: fe.color?.[0],
          icon: fe.icon?.[0],
          monthlyBudget: fe.monthlyBudget?.[0],
        })
        return
      }
      onSubmit(parsed.data)
    } else {
      // For creating, send all fields
      const parsed = createCategorySchema.safeParse(form)
      if (!parsed.success) {
        const fe = parsed.error.flatten().fieldErrors
        setErrors({
          name: fe.name?.[0],
          type: fe.type?.[0],
          color: fe.color?.[0],
          icon: fe.icon?.[0],
          monthlyBudget: fe.monthlyBudget?.[0],
        })
        return
      }
      onSubmit(parsed.data)
      // Reset form only after creating
      setForm({
        name: '',
        type: 'expense',
        parentId: null,
        color: '#CCCCCC',
        icon: 'tag',
        isDefault: false,
        monthlyBudget: 0,
      })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-neutral-700">Name</label>
        <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-invalid={!!errors.name} aria-describedby={errors.name ? 'name-error' : undefined} className="mt-1" />
        {errors.name && <p id="name-error" className="mt-1 text-sm text-error-600">{errors.name}</p>}
      </div>

      {!isEditing && (
        <div>
          <span className="block text-sm font-medium text-neutral-700">Type</span>
          <div className="mt-1 flex gap-2">
            {(['expense', 'income'] as const).map((t) => (
              <button key={t} type="button" onClick={() => setForm({ ...form, type: t })} className={`px-3 py-1.5 rounded-md border ${form.type === t ? 'border-primary-200 bg-primary-50 text-primary-700' : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50'}`}>{t}</button>
            ))}
          </div>
          {errors.type && <p className="mt-1 text-sm text-error-600">{errors.type}</p>}
        </div>
      )}

      {isEditing && (
        <div>
          <label className="block text-sm font-medium text-neutral-700">Type</label>
          <div className="mt-1 px-3 py-2 rounded-md border border-neutral-200 bg-neutral-50 text-neutral-600 capitalize">
            {form.type}
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-neutral-700">Icon</label>
        <IconPicker value={form.icon as IconKey} onChange={(k) => setForm({ ...form, icon: k })} className="mt-1" />
        {errors.icon && <p className="mt-1 text-sm text-error-600">{errors.icon}</p>}
      </div>

      <div>
        <label htmlFor="color" className="block text-sm font-medium text-neutral-700">Color</label>
        <div className="mt-1 flex items-center gap-3">
          <input id="color" type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-10 w-14 rounded-md border border-neutral-200 bg-white" aria-invalid={!!errors.color} />
          <Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="flex-1" />
        </div>
        {errors.color && <p className="mt-1 text-sm text-error-600">{errors.color}</p>}
      </div>

      <div>
        <label htmlFor="budget" className="block text-sm font-medium text-neutral-700">Monthly budget</label>
        <Input id="budget" type="number" step="0.01" value={form.monthlyBudget} onChange={(e) => setForm({ ...form, monthlyBudget: Number(e.target.value) })} className="mt-1" aria-invalid={!!errors.monthlyBudget} aria-describedby={errors.monthlyBudget ? 'budget-error' : undefined} />
        {errors.monthlyBudget && <p id="budget-error" className="mt-1 text-sm text-error-600">{errors.monthlyBudget}</p>}
      </div>

      <Button type="submit" disabled={busy} aria-busy={busy}>{busy ? 'Saving…' : 'Save category'}</Button>
    </form>
  )
}


