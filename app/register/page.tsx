'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { registerSchema, RegisterInput } from '@/lib/validators'
import { useToast } from '@/components/ui/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import Link from 'next/link'
import Image from 'next/image'
import { Eye, EyeOff, BarChart3, Users, TrendingUp, CheckCircle, Search, Plus, Shield, Zap } from 'lucide-react'

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  })

  const password = watch('password')

  const onSubmit = async (data: RegisterInput) => {
    if (!agreeToTerms) {
      toast({
        title: 'Error',
        description: 'Please agree to the terms and conditions',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Account created successfully! Please sign in.',
        })
        router.push('/login')
      } else {
        const error = await response.json()
        toast({
          title: 'Error',
          description: error.message || 'Failed to create account',
          variant: 'destructive',
        })
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
        {/* Left Panel - Register Form */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8">
            {/* Logo and Title */}
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <div className="h-20 w-20 flex items-center justify-center bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg shadow-lg">
                  <Image 
                    src="https://raw.githubusercontent.com/troikatechindia/Asset/refs/heads/main/logo.png" 
                    alt="Troika Tech Logo" 
                    width={64}
                    height={64}
                    className="object-contain"
                    priority
                  />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-gray-900">
                Create Account
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Join Troika Tech CRM and start managing your leads
              </p>
            </div>

            {/* Register Form */}
            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
              <CardContent className="p-8">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                        Full Name
                      </Label>
                      <Input
                        id="name"
                        type="text"
                        {...register('name')}
                        placeholder="Enter your full name"
                        className="mt-1 h-12 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      {errors.name && (
                        <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                        Email address
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
                      <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                        Password
                      </Label>
                      <div className="mt-1 relative">
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          {...register('password')}
                          placeholder="Create a password"
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

                    <div>
                      <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                        Confirm Password
                      </Label>
                      <div className="mt-1 relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Confirm your password"
                          className="h-12 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 pr-10"
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-5 w-5 text-gray-400" />
                          ) : (
                            <Eye className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <Checkbox
                      id="terms"
                      checked={agreeToTerms}
                      onCheckedChange={(checked: boolean) => setAgreeToTerms(checked)}
                    />
                    <Label htmlFor="terms" className="ml-2 text-sm text-gray-600">
                      I agree to the{' '}
                      <Link href="#" className="text-indigo-600 hover:text-indigo-500">
                        Terms and Conditions
                      </Link>{' '}
                      and{' '}
                      <Link href="#" className="text-indigo-600 hover:text-indigo-500">
                        Privacy Policy
                      </Link>
                    </Label>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Creating account...' : 'Create Account'}
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-600">
                    Already have an account?{' '}
                    <Link
                      href="/login"
                      className="font-medium text-indigo-600 hover:text-indigo-500"
                    >
                      Sign in
                    </Link>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Panel - Illustration */}
        <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 relative overflow-hidden">
          <div className="flex flex-col justify-center items-center text-white p-12 relative z-10">
            {/* 3D Illustration Elements */}
            <div className="relative mb-8">
              {/* Main illustration with team collaboration */}
              <div className="relative">
                {/* Team members */}
                <div className="absolute -left-20 top-4 w-16 h-16 bg-blue-400 rounded-full flex items-center justify-center shadow-2xl">
                  <Users className="w-8 h-8 text-white" />
                </div>
                
                <div className="absolute -right-20 top-8 w-16 h-16 bg-green-400 rounded-full flex items-center justify-center shadow-2xl">
                  <Shield className="w-8 h-8 text-white" />
                </div>

                {/* Central dashboard */}
                <div className="w-64 h-40 bg-white/20 backdrop-blur-sm rounded-2xl border border-white/30 shadow-2xl p-4">
                  {/* Dashboard content */}
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="w-16 h-2 bg-white/40 rounded"></div>
                      <div className="w-8 h-2 bg-white/40 rounded"></div>
                    </div>
                    
                    {/* Stats cards */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-blue-400/30 rounded p-2">
                        <div className="w-8 h-1 bg-white/60 rounded mb-1"></div>
                        <div className="w-6 h-1 bg-white/40 rounded"></div>
                      </div>
                      <div className="bg-green-400/30 rounded p-2">
                        <div className="w-8 h-1 bg-white/60 rounded mb-1"></div>
                        <div className="w-6 h-1 bg-white/40 rounded"></div>
                      </div>
                    </div>
                    
                    {/* Charts */}
                    <div className="flex space-x-1 mt-3">
                      <div className="w-4 h-8 bg-blue-400 rounded"></div>
                      <div className="w-4 h-6 bg-yellow-400 rounded"></div>
                      <div className="w-4 h-10 bg-green-400 rounded"></div>
                      <div className="w-4 h-4 bg-purple-400 rounded"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating elements */}
              <div className="absolute -top-4 -right-8 w-12 h-12 bg-yellow-400 rounded-lg transform rotate-45 shadow-xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div className="absolute -bottom-4 -left-8 w-8 h-8 bg-pink-400 rounded-full shadow-xl"></div>
              <div className="absolute top-1/2 -right-12 w-6 h-6 bg-orange-400 rounded-full shadow-xl"></div>
            </div>

            {/* Title and Description */}
            <div className="text-center max-w-md">
              <h3 className="text-3xl font-bold mb-4">
                Join Our Team
              </h3>
              <p className="text-lg text-white/90 leading-relaxed">
                Start your journey with Troika Tech CRM. Manage leads, track progress, and grow your business with our powerful tools and analytics.
              </p>
            </div>

            {/* Progress indicators */}
            <div className="flex space-x-2 mt-8">
              <div className="w-8 h-1 bg-white/50 rounded-full"></div>
              <div className="w-8 h-1 bg-white rounded-full"></div>
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