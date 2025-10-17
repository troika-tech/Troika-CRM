'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useToast } from '@/components/ui/use-toast'
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
import { Checkbox } from '@/components/ui/checkbox'

const editUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  mobile: z.string().regex(
    /^(\+91)?[6-9]\d{9}$/,
    'Please enter a valid 10-digit Indian mobile number'
  ),
  password: z.string().optional(),
  changePassword: z.boolean().optional(),
})

type EditUserInput = z.infer<typeof editUserSchema>

interface User {
  id: string
  name: string | null
  email: string
  role: string
  createdAt: string
  _count: {
    leads: number
  }
}

interface EditUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User | null
  onUserUpdated: () => void
}

export function EditUserDialog({ open, onOpenChange, user, onUserUpdated }: EditUserDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [changePassword, setChangePassword] = useState(false)
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<EditUserInput>({
    resolver: zodResolver(editUserSchema),
  })

  useEffect(() => {
    if (user) {
      setValue('name', user.name || '')
      setValue('email', user.email)
      setValue('mobile', '') // We don't store mobile in the current schema
      setValue('password', '')
      setChangePassword(false)
    }
  }, [user, setValue])

  const onSubmit = async (data: EditUserInput) => {
    if (!user) return

    setIsSubmitting(true)
    try {
      const updateData: any = {
        id: user.id,
        name: data.name,
        email: data.email,
      }

      if (changePassword && data.password) {
        updateData.password = data.password
      }

      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update user')
      }

      toast({
        title: 'Success',
        description: 'User updated successfully!',
      })

      onUserUpdated()
      onOpenChange(false)
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update user',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    reset()
    setChangePassword(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user information. Leave password empty to keep current password.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="Enter user's full name"
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
              placeholder="Enter user's email address"
            />
            {errors.email && (
              <p className="text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="mobile">Mobile Number</Label>
            <Input
              id="mobile"
              {...register('mobile')}
              placeholder="Enter 10-digit mobile number"
            />
            {errors.mobile && (
              <p className="text-sm text-red-600">{errors.mobile.message}</p>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="changePassword"
                checked={changePassword}
                onCheckedChange={(checked: boolean) => setChangePassword(checked)}
              />
              <Label htmlFor="changePassword">Change Password</Label>
            </div>

            {changePassword && (
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  {...register('password')}
                  placeholder="Enter new password"
                />
                {errors.password && (
                  <p className="text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
