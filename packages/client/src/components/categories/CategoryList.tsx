import type { Category } from '../../services/api/categories'
import Button from '../ui/Button'
import { ICONS, type IconKey } from '../../lib/utils/icons'
import { Tag } from 'lucide-react'

interface Props {
  items: Category[]
  onEdit: (c: Category) => void
  onDelete: (id: string) => void
}

export default function CategoryList({ items, onEdit, onDelete }: Props) {
  if (!items.length) {
    return (
      <div className="rounded-md border border-info-200 bg-info-50 text-info-600 p-3">No categories yet. Create your first one.</div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-neutral-600">
            <th className="py-2 pr-4">Name</th>
            <th className="py-2 pr-4">Type</th>
            <th className="py-2 pr-4">Budget</th>
            <th className="py-2 pr-4">Default</th>
            <th className="py-2 pr-4">Actions</th>
          </tr>
        </thead>
        <tbody className="align-top">
          {items.map((c, i) => (
            <tr key={c.id} className={`border-t border-neutral-200 px-2 ${i % 2 === 0 ? 'bg-neutral-50' : ''}`}>
              <td className="py-2 pr-4 pl-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-neutral-200" style={{ backgroundColor: c.color }} />
                  {(() => {
                    const IconComponent = ICONS[c.icon as IconKey] || Tag
                    return <IconComponent className="h-4 w-4 text-neutral-600" />
                  })()}
                  <span className="font-medium text-neutral-900">{c.name}</span>
                </div>
              </td>
              <td className="py-2 pr-4 capitalize">{c.type}</td>
              <td className="py-2 pr-4">{c.monthlyBudget ?? 0}</td>
              <td className="py-2 pr-4">{c.isDefault ? 'Yes' : '—'}</td>
              <td className="py-2 pr-4">
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => onEdit(c)}>Edit</Button>
                  <Button variant="destructive" onClick={() => onDelete(c.id)}>Delete</Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}


