import { z } from 'zod'

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['USER', 'ADMIN', 'SUPERADMIN']).optional(),
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const leadSchema = z.object({
  customerName: z.string().min(2, 'Customer name must be at least 2 characters'),
  mobile: z.string().regex(
    /^(\+91)?[6-9]\d{9}$/,
    'Please enter a valid 10-digit Indian mobile number'
  ),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  companyName: z.string().optional().or(z.literal('')),
  industryName: z.string().optional().or(z.literal('')),
  followUpDate: z.string().optional().or(z.literal('')),
  shortDescription: z.string().optional().or(z.literal('')),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type LeadInput = z.infer<typeof leadSchema>
