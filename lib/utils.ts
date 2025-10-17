import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '')
  
  // If it starts with 91 and has 12 digits, it's already in +91 format
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`
  }
  
  // If it has 10 digits, add +91 prefix
  if (digits.length === 10) {
    return `+91${digits}`
  }
  
  // Return as is if it doesn't match expected patterns
  return phone
}
