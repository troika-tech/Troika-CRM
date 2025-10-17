'use client'

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { 
  LayoutDashboard, 
  Users, 
  LogOut, 
  Plus,
  User,
  UserPlus,
  UserCheck
} from 'lucide-react'

interface SidebarProps {
  onAddLead?: () => void
  onAddUser?: () => void
}

export function Sidebar({ onAddLead, onAddUser }: SidebarProps) {
  const { data: session } = useSession()

  if (!session) return null

  const isAdmin = session.user.role === 'ADMIN'

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 h-screen flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">CRM</h1>
        <p className="text-sm text-gray-600">
          Welcome, {session.user.name || session.user.email}
        </p>
      </div>

      <div className="flex-1 p-4 space-y-2">
        {isAdmin ? (
          <>
            <Link href="/admin">
              <Button variant="ghost" className="w-full justify-start">
                <Users className="mr-2 h-4 w-4" />
                Admin Dashboard
              </Button>
            </Link>

            <Link href="/admin/users">
              <Button variant="ghost" className="w-full justify-start">
                <UserCheck className="mr-2 h-4 w-4" />
                All Users
              </Button>
            </Link>
            
            <Button 
              onClick={onAddUser}
              className="w-full justify-start"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </>
        ) : (
          <>
            <Link href="/dashboard">
              <Button variant="ghost" className="w-full justify-start">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            
            <Button 
              onClick={onAddLead}
              className="w-full justify-start"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Lead
            </Button>
          </>
        )}
      </div>

      <div className="p-4 border-t border-gray-200">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={() => signOut()}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  )
}
