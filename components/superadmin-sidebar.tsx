'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import {
  LayoutDashboard,
  Users,
  UserPlus,
  BarChart3,
  FileText,
  Plus,
  Eye,
  Settings,
  LogOut,
  UserCog
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SuperAdminSidebarProps {
  onAddLead?: () => void
  onAddUser?: () => void
  onAddAdmin?: () => void
}

export function SuperAdminSidebar({ onAddLead, onAddUser, onAddAdmin }: SuperAdminSidebarProps) {
  const pathname = usePathname()
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false)

  const navigation = [
    {
      name: 'Dashboard',
      href: '/superadmin',
      icon: LayoutDashboard,
      current: pathname === '/superadmin'
    },
    {
      name: 'All Users',
      href: '/superadmin/users',
      icon: Users,
      current: pathname === '/superadmin/users'
    },
    {
      name: 'All Admins',
      href: '/superadmin/admins',
      icon: Settings,
      current: pathname === '/superadmin/admins'
    },
    {
      name: 'Add User',
      href: '#',
      icon: UserPlus,
      onClick: onAddUser
    },
    {
      name: 'Add Admin',
      href: '#',
      icon: UserCog,
      onClick: onAddAdmin
    },
    {
      name: 'All Leads',
      href: '/superadmin/all-leads',
      icon: Eye,
      current: pathname === '/superadmin/all-leads'
    },
    {
      name: 'Add Lead',
      href: '#',
      icon: Plus,
      onClick: onAddLead
    },
    {
      name: 'Analytics',
      href: '#',
      icon: BarChart3,
      current: pathname === '/superadmin/analytics',
      children: [
        {
          name: 'Overview',
          href: '/superadmin/analytics',
          current: pathname === '/superadmin/analytics'
        }
      ]
    }
  ]

  return (
    <div className="flex h-screen w-64 flex-col bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      {/* Logo */}
      <div className="flex items-center justify-center px-6 py-4 border-b border-slate-700">
        <div className="flex items-center space-x-3">
          <div className="relative h-12 w-12">
            <Image
              src="https://raw.githubusercontent.com/troikatechindia/Asset/refs/heads/main/logo.png"
              alt="Troika Tech"
              fill
              className="object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
                const parent = target.parentElement
                if (parent) {
                  parent.innerHTML = '<div class="h-12 w-12 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">TT</div>'
                }
              }}
            />
          </div>
          <div>
            <h1 className="text-xl font-bold">Troika Tech</h1>
            <p className="text-xs text-slate-400">SuperAdmin Panel</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon
          const isActive = item.current

          if (item.children) {
            return (
              <div key={item.name}>
                <button
                  onClick={() => setIsAnalyticsOpen(!isAnalyticsOpen)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                  <svg
                    className={`ml-auto h-4 w-4 transition-transform ${
                      isAnalyticsOpen ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isAnalyticsOpen && (
                  <div className="ml-8 mt-2 space-y-1">
                    {item.children.map((child) => (
                      <Link
                        key={child.name}
                        href={child.href}
                        className={`block px-3 py-2 text-sm rounded-lg transition-colors ${
                          child.current
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                        }`}
                      >
                        {child.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          }

          return (
            <div key={item.name}>
              {item.onClick ? (
                <button
                  onClick={item.onClick}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </button>
              ) : (
                <Link
                  href={item.href}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              )}
            </div>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-slate-700">
        <Button
          variant="ghost"
          className="w-full justify-start text-slate-300 hover:bg-slate-700 hover:text-white"
          onClick={() => {
            // Handle logout
            window.location.href = '/api/auth/signout'
          }}
        >
          <LogOut className="mr-3 h-5 w-5" />
          Logout
        </Button>
      </div>
    </div>
  )
}
