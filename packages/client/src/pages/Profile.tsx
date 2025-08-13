import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import { getMe, updateProfile } from '../services/api/users'
import { profileUpdateSchema, type ProfileUpdateInput } from '../lib/validation/user'
import { useAppDispatch } from '../store/hooks'
import { setUser } from '../store/authSlice'

function formatDate(value?: string | null) {
  if (!value) return '—'
  try {
    const d = new Date(value)
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(d)
  } catch {
    return value ?? '—'
  }
}


export default function Profile() {
  const qc = useQueryClient()
  const dispatch = useAppDispatch()
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: getMe })

  const [profileForm, setProfileForm] = useState<ProfileUpdateInput>({ firstName: user?.profile.firstName, lastName: user?.profile.lastName, avatarUrl: undefined, mobileNumber: user?.profile.mobileNumber })
  const [profileErrors, setProfileErrors] = useState<Partial<Record<keyof ProfileUpdateInput, string>>>({})
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      setProfileForm({
        firstName: user.profile.firstName,
        lastName: user.profile.lastName,
        avatarUrl: undefined,
        mobileNumber: user.profile.mobileNumber,
      })
    }
  }, [user])

  const profileMut = useMutation({
    mutationFn: updateProfile,
    onSuccess: (updated) => {
      dispatch(setUser(updated))
      qc.invalidateQueries({ queryKey: ['me'] })
      setMessage('Profile updated')
    },
    onError: () => setMessage('Failed to update profile'),
  })

  function submitProfile(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    const parsed = profileUpdateSchema.safeParse(profileForm)
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors
      setProfileErrors({
        firstName: fe.firstName?.[0],
        lastName: fe.lastName?.[0],
        avatarUrl: fe.avatarUrl?.[0] as string | undefined,
        mobileNumber: fe.mobileNumber?.[0] as string | undefined,
      })
      return
    }
    setProfileErrors({})
    profileMut.mutate(parsed.data)
  }

  return (
    <div className="container py-8">
      <div className="mb-6 flex items-center gap-4">
        {user?.profile.avatar ? (
          <img src={user?.profile.avatar} alt="Avatar" className="h-16 w-16 rounded-full border border-slate-200 object-cover" />
        ) : (
          <div className="h-16 w-16 rounded-full border border-slate-200 bg-slate-100 flex items-center justify-center text-lg font-semibold text-slate-700">
            {user?.initials}
          </div>
        )}
        <div className="min-w-0">
          <h2 className="text-3xl font-semibold text-slate-900 leading-tight truncate">{user?.fullName ?? `${user?.profile.firstName ?? ''} ${user?.profile.lastName ?? ''}`.trim()}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-slate-600">{user?.email}</span>
            {user?.status && (
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">{user.status}</span>
            )}
          </div>
        </div>
      </div>
      {message && <p className="mb-4 text-sm text-slate-700" role="status">{message}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-xl font-semibold mb-4">Personal info</h3>
          <form onSubmit={submitProfile} className="space-y-4" noValidate>
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-slate-700">First name</label>
              <Input id="firstName" value={profileForm.firstName ?? ''} onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })} className="mt-1" aria-invalid={!!profileErrors.firstName} aria-describedby={profileErrors.firstName ? 'firstName-error' : undefined} />
              {profileErrors.firstName && <p id="firstName-error" className="mt-1 text-sm text-error-600">{profileErrors.firstName}</p>}
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-slate-700">Last name</label>
              <Input id="lastName" value={profileForm.lastName ?? ''} onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })} className="mt-1" aria-invalid={!!profileErrors.lastName} aria-describedby={profileErrors.lastName ? 'lastName-error' : undefined} />
              {profileErrors.lastName && <p id="lastName-error" className="mt-1 text-sm text-error-600">{profileErrors.lastName}</p>}
            </div>
            <div>
              <label htmlFor="mobileNumber" className="block text-sm font-medium text-slate-700">Mobile number</label>
              <Input id="mobileNumber" value={profileForm.mobileNumber ?? ''} onChange={(e) => setProfileForm({ ...profileForm, mobileNumber: e.target.value })} className="mt-1" aria-invalid={!!profileErrors.mobileNumber} aria-describedby={profileErrors.mobileNumber ? 'mobileNumber-error' : undefined} />
              {profileErrors.mobileNumber && <p id="mobileNumber-error" className="mt-1 text-sm text-error-600">{profileErrors.mobileNumber}</p>}
            </div>
            <Button type="submit" disabled={profileMut.isPending} aria-busy={profileMut.isPending}>{profileMut.isPending ? 'Saving…' : 'Save changes'}</Button>
          </form>
        </Card>

        <Card>
          <h3 className="text-xl font-semibold mb-4">Account & Preferences (read-only)</h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-slate-600">Email</dt>
              <dd className="text-sm font-medium text-slate-900 break-all">{user?.email ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-600">Status</dt>
              <dd className="text-sm font-medium text-slate-900">{user?.status ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-600">Currency</dt>
              <dd className="text-sm font-medium text-slate-900">{user?.settings?.currency ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-600">Theme</dt>
              <dd className="text-sm font-medium text-slate-900">{user?.settings?.theme ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-600">Mobile dial code</dt>
              <dd className="text-sm font-medium text-slate-900">{user?.settings?.mobileDialCode ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-600">Last login</dt>
              <dd className="text-sm font-medium text-slate-900">{formatDate(user?.lastLoginAt)}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-600">Member since</dt>
              <dd className="text-sm font-medium text-slate-900">{formatDate(user?.createdAt)}</dd>
            </div>
          </dl>
        </Card>
      </div>
    </div>
  )
}


