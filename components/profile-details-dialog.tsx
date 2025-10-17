'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { User, Mail, Calendar, Shield } from 'lucide-react'

interface ProfileDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProfileDetailsDialog({ open, onOpenChange }: ProfileDetailsDialogProps) {
  const { data: session } = useSession()

  if (!session) return null

  const userInitials = session.user.name 
    ? session.user.name.split(' ').map(n => n[0]).join('').toUpperCase()
    : session.user.email?.[0].toUpperCase() || 'U'

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'SUPERADMIN':
        return 'bg-purple-100 text-purple-800'
      case 'ADMIN':
        return 'bg-blue-100 text-blue-800'
      case 'USER':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'SUPERADMIN':
        return '👑'
      case 'ADMIN':
        return '🛡️'
      case 'USER':
        return '👤'
      default:
        return '👤'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Profile Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Profile Header */}
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src="" alt={session.user.name || 'User'} />
              <AvatarFallback className="bg-indigo-500 text-white text-lg">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="text-lg font-semibold">{session.user.name || 'User'}</h3>
              <p className="text-sm text-gray-600">{session.user.email}</p>
              <div className="mt-2">
                <Badge className={getRoleColor(session.user.role || 'USER')}>
                  {getRoleIcon(session.user.role || 'USER')} {session.user.role || 'USER'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center">
                <User className="h-4 w-4 mr-2" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={session.user.name || ''}
                    readOnly
                    className="bg-gray-50"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    value={session.user.email || ''}
                    readOnly
                    className="bg-gray-50"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Input
                    id="role"
                    value={session.user.role || 'USER'}
                    readOnly
                    className="bg-gray-50"
                  />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Input
                    id="status"
                    value="Active"
                    readOnly
                    className="bg-gray-50"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center">
                <Shield className="h-4 w-4 mr-2" />
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="memberSince">Member Since</Label>
                  <Input
                    id="memberSince"
                    value="January 2024"
                    readOnly
                    className="bg-gray-50"
                  />
                </div>
                <div>
                  <Label htmlFor="lastLogin">Last Login</Label>
                  <Input
                    id="lastLogin"
                    value="Today"
                    readOnly
                    className="bg-gray-50"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
