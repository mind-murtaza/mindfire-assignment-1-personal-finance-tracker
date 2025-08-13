import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import { getMe, updateProfile, changePassword } from '../services/api/users'
import { profileUpdateSchema, changePasswordSchema, type ProfileUpdateInput, type ChangePasswordInput } from '../lib/validation/user'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { setUser } from '../store/authSlice'
import { CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'

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
  const reduxUser = useAppSelector((s) => s.auth.user)
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
    // Seed from Redux and avoid redundant fetch if we already have user
    initialData: reduxUser ?? undefined,
    enabled: !reduxUser, // only fetch if not in Redux
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  const [profileForm, setProfileForm] = useState<ProfileUpdateInput>({ firstName: user?.profile.firstName, lastName: user?.profile.lastName, avatarUrl: undefined, mobileNumber: user?.profile.mobileNumber })
  const [profileErrors, setProfileErrors] = useState<Partial<Record<keyof ProfileUpdateInput, string>>>({})
  const [pwdForm, setPwdForm] = useState<ChangePasswordInput>({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [pwdErrors, setPwdErrors] = useState<Partial<Record<keyof ChangePasswordInput, string>>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [messageType, setMessageType] = useState<'success' | 'warning' | 'error' | 'info' | null>(null)

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
      qc.setQueryData(['me'], updated)
      setMessage('Profile updated')
      setMessageType('success')
    },
    onError: () => {
      setMessage('Failed to update profile')
      setMessageType('error')
    },
  })

  const changePwdMut = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      setMessage('Password updated')
      setMessageType('success')
    },
    onError: () => {
      setMessage('Failed to update password')
      setMessageType('error')
    },
  })


  function submitProfile(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    setMessageType(null)
    const parsed = profileUpdateSchema.safeParse(profileForm)

    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors
      setProfileErrors({
        firstName: fe.firstName?.[0],
        lastName: fe.lastName?.[0],
        avatarUrl: fe.avatarUrl?.[0] as string | undefined,
        mobileNumber: fe.mobileNumber?.[0] as string | undefined,
      })
      setMessage('Please fix the highlighted fields')
      setMessageType('error')
      return
    }
    setProfileErrors({})
    if (JSON.stringify(parsed.data) === JSON.stringify(profileForm)) {
      setMessage('No changes detected')
      setMessageType('warning')
      return
    }

    profileMut.mutate(parsed.data)
  }

  function submitPassword(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    setMessageType(null)
    const parsed = changePasswordSchema.safeParse(pwdForm)
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors
      setPwdErrors({
        currentPassword: fe.currentPassword?.[0],
        newPassword: fe.newPassword?.[0],
        confirmPassword: fe.confirmPassword?.[0],
      })
      setMessage('Please fix the highlighted fields')
      setMessageType('error')
      return
    }
    setPwdErrors({})
    changePwdMut.mutate({ currentPassword: parsed.data.currentPassword, newPassword: parsed.data.newPassword })
    setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
  }

  return (
    <div className="container py-8">
      <div className="mb-6 flex items-center gap-4">
        {user?.profile.avatar ? (
          <img src={user?.profile.avatar} alt="Avatar" className="h-16 w-16 rounded-full border border-neutral-200 object-cover" />
        ) : (
          <div className="h-16 w-16 rounded-full border border-neutral-200 bg-neutral-50 flex items-center justify-center text-lg font-semibold text-neutral-700">
            {user?.initials}
          </div>
        )}
        <div className="min-w-0">
          <h2 className="text-3xl font-semibold text-neutral-900 leading-tight truncate">{user?.fullName ?? `${user?.profile.firstName ?? ''} ${user?.profile.lastName ?? ''}`.trim()}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-neutral-600">{user?.email}</span>
            {user?.status && (
              <span className="inline-flex items-center rounded-full bg-success-50 px-2 py-0.5 text-xs font-medium text-success-600 border border-success-200">{user.status}</span>
            )}
          </div>
        </div>
      </div>
      {message && (
        <div
          role="status"
          aria-live="polite"
          className={`mb-4 rounded-md border p-3 shadow-sm border-${messageType}-200 bg-${messageType}-50 text-${messageType}-600 flex items-center gap-2`}
        >
          {messageType === 'success' && <CheckCircle className="w-4 h-4" />}
          {messageType === 'warning' && <AlertTriangle className="w-4 h-4" />}
          {messageType === 'error' && <AlertCircle className="w-4 h-4" />}
          {messageType === 'info' && <Info className="w-4 h-4" />}
          <span>{message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-xl font-semibold mb-4 text-neutral-900">Personal info</h3>
          <form onSubmit={submitProfile} className="space-y-4" noValidate>
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-neutral-700">First name</label>
              <Input id="firstName" value={profileForm.firstName ?? ''} onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })} className="mt-1" aria-invalid={!!profileErrors.firstName} aria-describedby={profileErrors.firstName ? 'firstName-error' : undefined} />
              {profileErrors.firstName && <p id="firstName-error" className="mt-1 text-sm text-error-600">{profileErrors.firstName}</p>}
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-neutral-700">Last name</label>
              <Input id="lastName" value={profileForm.lastName ?? ''} onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })} className="mt-1" aria-invalid={!!profileErrors.lastName} aria-describedby={profileErrors.lastName ? 'lastName-error' : undefined} />
              {profileErrors.lastName && <p id="lastName-error" className="mt-1 text-sm text-error-600">{profileErrors.lastName}</p>}
            </div>
            <div>
              <label htmlFor="mobileNumber" className="block text-sm font-medium text-neutral-700">Mobile number</label>
              <Input id="mobileNumber" value={profileForm.mobileNumber ?? ''} onChange={(e) => setProfileForm({ ...profileForm, mobileNumber: e.target.value })} className="mt-1" aria-invalid={!!profileErrors.mobileNumber} aria-describedby={profileErrors.mobileNumber ? 'mobileNumber-error' : undefined} />
              {profileErrors.mobileNumber && <p id="mobileNumber-error" className="mt-1 text-sm text-error-600">{profileErrors.mobileNumber}</p>}
            </div>
            <Button type="submit" disabled={profileMut.isPending} aria-busy={profileMut.isPending}>{profileMut.isPending ? 'Saving…' : 'Save changes'}</Button>
          </form>
        </Card>

        <Card>
          <h3 className="text-xl font-semibold mb-4 text-neutral-900">Account & Preferences</h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-neutral-600">Email</dt>
              <dd className="text-sm font-medium text-neutral-900 break-all">{user?.email ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-sm text-neutral-600">Status</dt>
              <dd className="text-sm font-medium text-neutral-900">{user?.status ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-sm text-neutral-600">Currency</dt>
              <dd className="text-sm font-medium text-neutral-900">{user?.settings?.currency ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-sm text-neutral-600">Theme</dt>
              <dd className="text-sm font-medium text-neutral-900">{user?.settings?.theme ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-sm text-neutral-600">Mobile dial code</dt>
              <dd className="text-sm font-medium text-neutral-900">{user?.settings?.mobileDialCode ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-sm text-neutral-600">Last login</dt>
              <dd className="text-sm font-medium text-neutral-900">{formatDate(user?.lastLoginAt)}</dd>
            </div>
            <div>
              <dt className="text-sm text-neutral-600">Member since</dt>
              <dd className="text-sm font-medium text-neutral-900">{formatDate(user?.createdAt)}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h3 className="text-xl font-semibold mb-4 text-neutral-900">Change password</h3>
          <form onSubmit={submitPassword} className="space-y-4" noValidate>
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-neutral-700">Current password</label>
              <Input id="currentPassword" type="password" value={pwdForm.currentPassword} onChange={(e) => setPwdForm({ ...pwdForm, currentPassword: e.target.value })} className="mt-1" aria-invalid={!!pwdErrors.currentPassword} aria-describedby={pwdErrors.currentPassword ? 'currentPassword-error' : undefined} />
              {pwdErrors.currentPassword && <p id="currentPassword-error" className="mt-1 text-sm text-error-600">{pwdErrors.currentPassword}</p>}
            </div>
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-neutral-700">New password</label>
              <Input id="newPassword" type="password" value={pwdForm.newPassword} onChange={(e) => setPwdForm({ ...pwdForm, newPassword: e.target.value })} className="mt-1" aria-invalid={!!pwdErrors.newPassword} aria-describedby={pwdErrors.newPassword ? 'newPassword-error' : undefined} />
              {pwdErrors.newPassword && <p id="newPassword-error" className="mt-1 text-sm text-error-600">{pwdErrors.newPassword}</p>}
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-neutral-700">Confirm new password</label>
              <Input id="confirmPassword" type="password" value={pwdForm.confirmPassword} onChange={(e) => setPwdForm({ ...pwdForm, confirmPassword: e.target.value })} className="mt-1" aria-invalid={!!pwdErrors.confirmPassword} aria-describedby={pwdErrors.confirmPassword ? 'confirmPassword-error' : undefined} />
              {pwdErrors.confirmPassword && <p id="confirmPassword-error" className="mt-1 text-sm text-error-600">{pwdErrors.confirmPassword}</p>}
            </div>
            <Button type="submit" disabled={changePwdMut.isPending} aria-busy={changePwdMut.isPending}>{changePwdMut.isPending ? 'Updating…' : 'Update password'}</Button>
          </form>
        </Card>
      </div>
    </div>
  )
}


