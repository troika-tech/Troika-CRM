'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { leadSchema, LeadInput } from '@/lib/validators'
import { useToast } from '@/components/ui/use-toast'
import { ModernSidebar } from '@/components/modern-sidebar'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function AddLeadPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const { data: session, status } = useSession()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<LeadInput>({
    resolver: zodResolver(leadSchema),
  })

  const onSubmit = async (data: LeadInput) => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create lead')
      }

      toast({
        title: 'Success',
        description: 'Lead added successfully',
      })

      reset()
      router.push('/dashboard/leads')
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create lead',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    router.push('/login')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <ModernSidebar 
          onAddLead={() => {}}
          onAddUser={() => {}}
          onAddAdmin={() => {}}
        />

        <div className="flex-1 flex flex-col ml-64">
          <Header />
          
          <div className="flex-1 p-6">
            <div className="max-w-3xl mx-auto">
              {/* Header */}
              <div className="mb-6">
                <Link
                  href="/dashboard/leads"
                  className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to My Leads
                </Link>
                <h1 className="text-3xl font-bold text-gray-900">Add New Lead</h1>
                <p className="text-gray-600 mt-1">Enter the customer details to create a new lead.</p>
              </div>

              {/* Form Card */}
              <Card className="shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">Lead Information</CardTitle>
                  <CardDescription className="text-sm mt-1">
                    Fill in the details below. Fields marked with <span className="text-red-500">*</span> are required.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Customer Name - Full Width */}
                    <div className="space-y-2">
                      <Label htmlFor="customerName" className="text-sm font-medium">
                        Customer Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="customerName"
                        {...register('customerName')}
                        placeholder="Enter customer name"
                        className="h-11"
                      />
                      {errors.customerName && (
                        <p className="text-sm text-red-600 mt-1">{errors.customerName.message}</p>
                      )}
                    </div>

                    {/* Mobile and Email - Two Columns */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="mobile" className="text-sm font-medium">
                          Mobile Number <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="mobile"
                          {...register('mobile')}
                          placeholder="Enter 10-digit mobile number"
                          className="h-11"
                        />
                        {errors.mobile && (
                          <p className="text-sm text-red-600 mt-1">{errors.mobile.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium">
                          Email ID <span className="text-gray-500 text-xs font-normal">(Optional)</span>
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          {...register('email')}
                          placeholder="Enter email address"
                          className="h-11"
                        />
                        {errors.email && (
                          <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
                        )}
                      </div>
                    </div>

                    {/* Company and Industry - Two Columns */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="companyName" className="text-sm font-medium">
                          Company Name <span className="text-gray-500 text-xs font-normal">(Optional)</span>
                        </Label>
                        <Input
                          id="companyName"
                          {...register('companyName')}
                          placeholder="Enter company name"
                          className="h-11"
                        />
                        {errors.companyName && (
                          <p className="text-sm text-red-600 mt-1">{errors.companyName.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="industryName" className="text-sm font-medium">
                          Industry Name <span className="text-gray-500 text-xs font-normal">(Optional)</span>
                        </Label>
                        <Input
                          id="industryName"
                          {...register('industryName')}
                          placeholder="Enter industry name"
                          className="h-11"
                        />
                        {errors.industryName && (
                          <p className="text-sm text-red-600 mt-1">{errors.industryName.message}</p>
                        )}
                      </div>
                    </div>

                    {/* Lead Status and Follow-up Date - Two Columns */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="leadStatus" className="text-sm font-medium">
                          Lead Status <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={watch('leadStatus') || ''}
                          onValueChange={(value) => setValue('leadStatus', value as 'Lead' | 'Prospect' | 'Other', { shouldValidate: true })}
                        >
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Select Lead Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Lead">Lead</SelectItem>
                            <SelectItem value="Prospect">Prospect</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        {errors.leadStatus && (
                          <p className="text-sm text-red-600 mt-1">{errors.leadStatus.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="followUpDate" className="text-sm font-medium">
                          Follow-up Date <span className="text-gray-500 text-xs font-normal">(Optional)</span>
                        </Label>
                        <Input
                          id="followUpDate"
                          type="date"
                          {...register('followUpDate')}
                          className="h-11"
                        />
                        {errors.followUpDate && (
                          <p className="text-sm text-red-600 mt-1">{errors.followUpDate.message}</p>
                        )}
                      </div>
                    </div>

                    {/* Short Description - Full Width */}
                    <div className="space-y-2">
                      <Label htmlFor="shortDescription" className="text-sm font-medium">
                        Short Description <span className="text-gray-500 text-xs font-normal">(Optional)</span>
                      </Label>
                      <Textarea
                        id="shortDescription"
                        {...register('shortDescription')}
                        placeholder="Enter a brief description of the lead or message"
                        rows={4}
                        className="min-h-[100px] resize-y"
                      />
                      {errors.shortDescription && (
                        <p className="text-sm text-red-600 mt-1">{errors.shortDescription.message}</p>
                      )}
                    </div>

                    {/* Form Actions */}
                    <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.push('/dashboard/leads')}
                        disabled={isSubmitting}
                        className="min-w-[100px]"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="min-w-[120px]"
                      >
                        {isSubmitting ? 'Adding...' : 'Add Lead'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

