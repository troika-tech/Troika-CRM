'use client'

import { useState } from 'react'
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Copy, Check } from 'lucide-react'

const userSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  mobile: z.string().regex(
    /^(\+91)?[6-9]\d{9}$/,
    'Please enter a valid 10-digit Indian mobile number'
  ),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type UserInput = z.infer<typeof userSchema>

interface UserFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUserAdded: () => void
}

export function UserFormDialog({ open, onOpenChange, onUserAdded }: UserFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createdUser, setCreatedUser] = useState<{ email: string; password: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<UserInput>({
    resolver: zodResolver(userSchema),
  })

  const onSubmit = async (data: UserInput) => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create user')
      }

      const result = await response.json()
      setCreatedUser({
        email: result.user.email,
        password: result.user.password
      })

      toast({
        title: 'Success',
        description: 'User created successfully! Share the credentials below.',
      })

      onUserAdded()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create user',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    reset()
    setCreatedUser(null)
    setCopied(false)
    onOpenChange(false)
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy: ', err)
    }
  }

  const copyCredentials = () => {
    const credentials = `Email: ${createdUser?.email}\nPassword: ${createdUser?.password}`
    copyToClipboard(credentials)
  }

  if (createdUser) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>User Created Successfully!</DialogTitle>
            <DialogDescription>
              Share these credentials with the new user so they can login.
            </DialogDescription>
          </DialogHeader>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Login Credentials</CardTitle>
              <CardDescription>
                Copy and share these details with the user
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Email Address</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    value={createdUser.email}
                    readOnly
                    className="bg-gray-50"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(createdUser.email)}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Password</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    value={createdUser.password}
                    readOnly
                    className="bg-gray-50"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(createdUser.password)}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button
                onClick={copyCredentials}
                className="w-full"
                variant="outline"
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy All Credentials
              </Button>
            </CardContent>
          </Card>

          <DialogFooter>
            <Button onClick={handleCancel}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>
            Create a new user account. They will receive login credentials.
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

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              {...register('password')}
              placeholder="Create a password for the user"
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
              {isSubmitting ? 'Creating User...' : 'Create User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
