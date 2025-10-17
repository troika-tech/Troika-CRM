'use client'

import { useState } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, LoginInput } from '@/lib/validators'
import { useToast } from '@/components/ui/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import Link from 'next/link'
import Image from 'next/image'
import { Eye, EyeOff, BarChart3, Users, TrendingUp, CheckCircle, Search, Plus } from 'lucide-react'

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [logoError, setLogoError] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true)
    try {
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      })

      if (result?.error) {
        toast({
          title: 'Error',
          description: 'Invalid credentials. Please try again.',
          variant: 'destructive',
        })
      } else {
        const session = await getSession()
        if (session?.user?.role === 'ADMIN') {
          router.push('/admin')
        } else {
          router.push('/dashboard')
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="flex min-h-screen">
        {/* Left Panel - Login Form */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8">
            {/* Logo and Title */}
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <img 
                  src="https://raw.githubusercontent.com/troikatechindia/Asset/refs/heads/main/logo.png" 
                  alt="Troika Tech Logo" 
                  className="h-20 w-20 object-contain"
                  onLoad={() => console.log('Logo loaded successfully')}
                  onError={(e) => {
                    console.log('Logo failed to load:', e);
                    setLogoError(true);
                  }}
                />
                {logoError && (
                  <div className="h-20 w-20 flex items-center justify-center text-gray-600 font-bold text-2xl">
                    TT
                  </div>
                )}
              </div>
              <h2 className="text-3xl font-bold text-gray-900">
                Welcome Back
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Sign in to your Troika Tech CRM account
              </p>
            </div>

            {/* Login Form */}
            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
              <CardContent className="p-8">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                        Username or email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        {...register('email')}
                        placeholder="Enter your email"
                        className="mt-1 h-12 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      {errors.email && (
                        <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                          Password
                        </Label>
                        <Link
                          href="#"
                          className="text-sm text-indigo-600 hover:text-indigo-500"
                        >
                          Forgot password?
                        </Link>
                      </div>
                      <div className="mt-1 relative">
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          {...register('password')}
                          placeholder="Enter your password"
                          className="h-12 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 pr-10"
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-5 w-5 text-gray-400" />
                          ) : (
                            <Eye className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                      </div>
                      {errors.password && (
                        <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Checkbox
                        id="remember"
                        checked={rememberMe}
                        onCheckedChange={(checked: boolean) => setRememberMe(checked)}
                      />
                      <Label htmlFor="remember" className="ml-2 text-sm text-gray-600">
                        Remember me
                      </Label>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Signing in...' : 'Login'}
                  </Button>
                </form>

              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Panel - Illustration */}
        <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 relative overflow-hidden">
          <div className="flex flex-col justify-center items-center text-white p-12 relative z-10">
            {/* 3D Illustration Elements */}
            <div className="relative mb-8">
              {/* Main hands illustration */}
              <div className="relative">
                {/* Left hand with lightbulb */}
                <div className="absolute -left-16 top-8 w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center shadow-2xl transform rotate-12">
                  <div className="w-8 h-8 bg-yellow-300 rounded-full"></div>
                </div>
                
                {/* Right hand with stylus */}
                <div className="absolute -right-16 top-4 w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-2xl transform -rotate-12">
                  <div className="w-2 h-8 bg-gray-400 rounded-full"></div>
                </div>

                {/* Central screen/tablet */}
                <div className="w-64 h-40 bg-white/20 backdrop-blur-sm rounded-2xl border border-white/30 shadow-2xl p-4">
                  {/* Screen content */}
                  <div className="space-y-3">
                    {/* Checklist */}
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <div className="w-16 h-2 bg-green-400 rounded"></div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <div className="w-12 h-2 bg-green-400 rounded"></div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <div className="w-20 h-2 bg-green-400 rounded"></div>
                    </div>
                    
                    {/* Search bar */}
                    <div className="flex items-center space-x-2 mt-3">
                      <Search className="w-4 h-4 text-white/70" />
                      <div className="w-24 h-2 bg-white/30 rounded"></div>
                    </div>
                    
                    {/* Charts */}
                    <div className="flex space-x-2 mt-3">
                      <div className="w-8 h-6 bg-blue-400 rounded"></div>
                      <div className="w-8 h-6 bg-yellow-400 rounded"></div>
                      <div className="w-8 h-6 bg-green-400 rounded"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating elements */}
              <div className="absolute -top-4 -right-8 w-12 h-12 bg-blue-400 rounded-lg transform rotate-45 shadow-xl"></div>
              <div className="absolute -bottom-4 -left-8 w-8 h-8 bg-yellow-400 rounded-full shadow-xl"></div>
              <div className="absolute top-1/2 -right-12 w-6 h-6 bg-green-400 rounded-full shadow-xl"></div>
            </div>

            {/* Title and Description */}
            <div className="text-center max-w-md">
              <h3 className="text-3xl font-bold mb-4">
                Check Your Lead Status
              </h3>
              <p className="text-lg text-white/90 leading-relaxed">
                Track your leads, manage your team, and analyze your performance with our comprehensive CRM dashboard. Get insights that matter.
              </p>
            </div>

            {/* Progress indicators */}
            <div className="flex space-x-2 mt-8">
              <div className="w-8 h-1 bg-white rounded-full"></div>
              <div className="w-8 h-1 bg-white/50 rounded-full"></div>
              <div className="w-8 h-1 bg-white/50 rounded-full"></div>
            </div>
          </div>

          {/* Background decorative elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full"></div>
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  )
}