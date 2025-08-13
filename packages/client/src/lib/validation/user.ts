import { z } from 'zod'
import { makeNameSchema } from './auth'

export const profileUpdateSchema = z
  .object({
    firstName: makeNameSchema('First name').optional(),
    lastName: makeNameSchema('Last name').optional(),
    avatarUrl: z
      .string()
      .url('Avatar URL must be a valid URL')
      .refine((v) => v.startsWith('http'), 'Avatar URL must be http/https')
      .max(500, 'Avatar URL too long')
      .nullable()
      .optional(),
    mobileNumber: z
      .string()
      .regex(/^\d{10}$/g, 'Mobile number must be 10 digits')
      .nullable()
      .optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: 'Provide at least one field',
    path: ['firstName'],
  })

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>

export const settingsUpdateSchema = z
  .object({
    currency: z.string().length(3, 'Currency must be 3-letter ISO code').optional(),
    theme: z.enum(['light', 'dark', 'system']).optional(),
    mobileDialCode: z.string().startsWith('+').min(1).max(5, 'Mobile dial code cannot exceed 5 characters').optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: 'Provide at least one field',
    path: ['currency'],
  })

export type SettingsUpdateInput = z.infer<typeof settingsUpdateSchema>


