import { z } from 'zod'
import { passwordSchema, makeNameSchema } from './common'

const emailSchema = z
	.string()
	.email("Invalid email format")
	.min(5, "Email must be at least 5 characters")
	.max(254, "Email cannot exceed 254 characters")
	.toLowerCase()
	.describe("User email address");

const loginSchema = z.object({
	email: emailSchema,
	password: passwordSchema,
});

const registerSchema = z.object({
	email: emailSchema,
	password: passwordSchema,
	firstName: makeNameSchema("First name"),
	lastName: makeNameSchema("Last name"),
});

export { loginSchema, registerSchema };
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
