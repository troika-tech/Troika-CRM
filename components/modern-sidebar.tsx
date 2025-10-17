'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { 
  LayoutDashboard, 
  Users, 
  UserPlus,
  UserCheck,
  BarChart3,
  FileText,
  Settings,
  ChevronDown,
  Plus,
  List
} from 'lucide-react'

interface ModernSidebarProps {
  onAddLead?: () => void
  onAddUser?: () => void
  onAddAdmin?: () => void
}

export function ModernSidebar({ onAddLead, onAddUser, onAddAdmin }: ModernSidebarProps) {
  const { data: session } = useSession()

  if (!session) return null

  const isAdmin = session.user.role === 'ADMIN'
  const isSuperAdmin = session.user.role === 'SUPERADMIN'

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col shadow-lg">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center space-x-3">
          <div className="h-12 w-12 flex items-center justify-center bg-white rounded-lg shadow-sm">
            <Image 
              src="https://raw.githubusercontent.com/troikatechindia/Asset/refs/heads/main/logo.png" 
              alt="Troika Tech Logo" 
              width={48}
              height={48}
              className="object-contain"
            />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Troika Tech</h1>
            <p className="text-xs text-gray-500">
              {isSuperAdmin ? 'SuperAdmin Panel' : isAdmin ? 'Admin Panel' : 'Customer Management'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 p-4 space-y-2">
        {/* Main Navigation */}
        <div className="space-y-1">
          <Link href={isSuperAdmin ? "/superadmin" : isAdmin ? "/admin" : "/dashboard"}>
            <Button 
              variant="ghost" 
              className="w-full justify-start text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-all duration-200"
            >
              <LayoutDashboard className="mr-3 h-4 w-4" />
              Dashboard
            </Button>
          </Link>

          {(isAdmin || isSuperAdmin) && (
            <>
              <Link href={isSuperAdmin ? "/superadmin/users" : "/admin/users"}>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-all duration-200"
                >
                  <Users className="mr-3 h-4 w-4" />
                  All Users
                </Button>
              </Link>
            </>
          )}

          {isSuperAdmin && (
            <>
              <Link href="/superadmin/admins">
                <Button 
                  variant="ghost" 
                  className="w-full justify-start text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-all duration-200"
                >
                  <UserCheck className="mr-3 h-4 w-4" />
                  All Admins
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* User Management Section - Only for Admin/SuperAdmin */}
        {(isAdmin || isSuperAdmin) && (
          <div className="pt-6">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              User Management
            </p>
            <div className="space-y-1">
              <Button 
                onClick={onAddUser}
                className="w-full justify-start text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-all duration-200"
                variant="ghost"
              >
                <UserPlus className="mr-3 h-4 w-4" />
                Add User
              </Button>

              {isSuperAdmin && onAddAdmin && (
                <Button 
                  onClick={onAddAdmin}
                  className="w-full justify-start text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-all duration-200"
                  variant="ghost"
                >
                  <Settings className="mr-3 h-4 w-4" />
                  Add Admin
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Lead Management Section */}
        <div className="pt-6">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Lead Management
          </p>
          <div className="space-y-1">
            <Button 
              onClick={onAddLead}
              className="w-full justify-start text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-all duration-200"
              variant="ghost"
            >
              <Plus className="mr-3 h-4 w-4" />
              Add Lead
            </Button>

            <Link href={isSuperAdmin ? "/superadmin/all-leads" : isAdmin ? "/admin/all-leads" : "/dashboard/leads"}>
              <Button 
                variant="ghost" 
                className="w-full justify-start text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-all duration-200"
              >
                <List className="mr-3 h-4 w-4" />
                View All Leads
              </Button>
            </Link>
          </div>
        </div>

        {/* Analytics Section */}
        <div className="pt-6">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Analytics
          </p>
          <div className="space-y-1">
            <Link href={isSuperAdmin ? "/superadmin/analytics" : "/analytics"}>
              <Button 
                variant="ghost" 
                className="w-full justify-start text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-all duration-200"
              >
                <BarChart3 className="mr-3 h-4 w-4" />
                Analytics
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-sm">
            <span className="text-white text-sm font-semibold">
              {session.user.name?.[0] || session.user.email?.[0] || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {session.user.name || session.user.email}
            </p>
            <p className="text-xs text-gray-500 font-medium">
              {isSuperAdmin ? 'Super Admin' : isAdmin ? 'Administrator' : 'User'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
