import { z } from 'zod'

const emailSchema = z
  .string()
  .email('Invalid email format')
  .min(5, 'Email must be at least 5 characters')
  .max(254, 'Email cannot exceed 254 characters')
  .toLowerCase()
  .describe('User email address')

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password cannot exceed 128 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
    'Password must contain: lowercase, uppercase, number, and special character',
  )
  .describe('User password')

const makeNameSchema = (name: string = 'Name') => z
	.string()
	.min(1, `${name} is required`)
	.max(50, `${name} cannot exceed 50 characters`)
	.regex(/^[a-zA-Z]+$/, `${name} can only contain letters`)
	.trim();

const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
})


const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: makeNameSchema('First name'),
  lastName: makeNameSchema('Last name'),
})

export { loginSchema, registerSchema, makeNameSchema }
export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>


