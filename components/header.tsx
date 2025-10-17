'use client'

import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ProfileDetailsDialog } from '@/components/profile-details-dialog'
import { ChangePasswordDialog } from '@/components/change-password-dialog'
import { 
  Search, 
  Bell, 
  MessageCircle, 
  ChevronDown,
  Settings,
  LogOut,
  User,
  Key
} from 'lucide-react'

export function Header() {
  const { data: session } = useSession()
  const [searchQuery, setSearchQuery] = useState('')
  const [showProfileDetails, setShowProfileDetails] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)

  if (!session) return null

  const userInitials = session.user.name 
    ? session.user.name.split(' ').map(n => n[0]).join('').toUpperCase()
    : session.user.email?.[0].toUpperCase() || 'U'

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Search Bar */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full bg-gray-50 border-gray-200 rounded-lg focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <div className="relative">
            <Button variant="ghost" size="icon" className="relative">
              <MessageCircle className="h-5 w-5 text-gray-600" />
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-indigo-500 text-white text-xs rounded-full flex items-center justify-center">
                6
              </span>
            </Button>
          </div>

          <div className="relative">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5 text-gray-600" />
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-indigo-500 text-white text-xs rounded-full flex items-center justify-center">
                8
              </span>
            </Button>
          </div>

          {/* User Profile */}
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                {session.user.name || 'User'}
              </p>
              <p className="text-xs text-green-600 font-medium">
                Available
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="" alt={session.user.name || 'User'} />
                      <AvatarFallback className="bg-indigo-500 text-white text-sm">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium">{session.user.name || 'User'}</p>
                      <p className="w-[200px] truncate text-sm text-muted-foreground">
                        {session.user.email}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowProfileDetails(true)}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile Details</span>
                  </DropdownMenuItem>
                  {session.user.role === 'SUPERADMIN' && (
                    <DropdownMenuItem onClick={() => setShowChangePassword(true)}>
                      <Key className="mr-2 h-4 w-4" />
                      <span>Change Password</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
      
      {/* Dialogs */}
      <ProfileDetailsDialog 
        open={showProfileDetails} 
        onOpenChange={setShowProfileDetails} 
      />
      <ChangePasswordDialog 
        open={showChangePassword} 
        onOpenChange={setShowChangePassword} 
      />
    </header>
  )
}
