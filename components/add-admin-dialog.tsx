'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'

const addAdminSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  mobile: z.string().regex(
    /^(\+91)?[6-9]\d{9}$/,
    'Please enter a valid 10-digit Indian mobile number'
  ),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type AddAdminInput = z.infer<typeof addAdminSchema>

interface AddAdminDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdminAdded: () => void
}

export function AddAdminDialog({ open, onOpenChange, onAdminAdded }: AddAdminDialogProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AddAdminInput>({
    resolver: zodResolver(addAdminSchema),
  })

  const onSubmit = async (data: AddAdminInput) => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          role: 'ADMIN',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create admin')
      }

      toast({
        title: 'Success',
        description: 'Admin created successfully!',
      })

      reset()
      onOpenChange(false)
      onAdminAdded()
    } catch (error) {
      console.error('Error creating admin:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create admin',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Admin</DialogTitle>
          <DialogDescription>
            Create a new admin account. The admin will be able to manage users and leads.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Admin Name</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="Enter admin name"
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              placeholder="Enter email address"
            />
            {errors.email && (
              <p className="text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="mobile">Mobile Number</Label>
            <Input
              id="mobile"
              type="tel"
              {...register('mobile')}
              placeholder="Enter mobile number (e.g., 9876543210)"
            />
            {errors.mobile && (
              <p className="text-sm text-red-600">{errors.mobile.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              {...register('password')}
              placeholder="Enter password (min 6 characters)"
            />
            {errors.password && (
              <p className="text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Admin'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
