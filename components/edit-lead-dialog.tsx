'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { Edit } from 'lucide-react'

const editLeadSchema = z.object({
  customerName: z.string().min(2, 'Customer name must be at least 2 characters'),
  mobile: z.string().regex(
    /^(\+91)?[6-9]\d{9}$/,
    'Please enter a valid 10-digit Indian mobile number'
  ),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  companyName: z.string().min(2, 'Company name must be at least 2 characters').optional().or(z.literal('')),
  industryName: z.string().min(2, 'Industry name must be at least 2 characters').optional().or(z.literal('')),
  followUpDate: z.string().optional(),
  shortDescription: z.string().min(10, 'Short description must be at least 10 characters').optional().or(z.literal('')),
})

interface Lead {
  id: string
  customerName: string
  mobile: string
  email: string | null
  companyName?: string | null
  industryName?: string | null
  shortDescription?: string | null
  followUpDate?: string | null
  createdAt: string
  createdBy?: {
    name: string | null
    email: string
  }
}

interface EditLeadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lead: Lead
  onLeadUpdated: () => void
}

export function EditLeadDialog({ open, onOpenChange, lead, onLeadUpdated }: EditLeadDialogProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<z.infer<typeof editLeadSchema>>({
    resolver: zodResolver(editLeadSchema),
  })

  // Reset form when lead changes
  useEffect(() => {
    if (lead) {
      setValue('customerName', lead.customerName)
      setValue('mobile', lead.mobile)
      setValue('email', lead.email || '')
      setValue('companyName', lead.companyName || '')
      setValue('industryName', lead.industryName || '')
      setValue('shortDescription', lead.shortDescription || '')
      setValue('followUpDate', lead.followUpDate ? new Date(lead.followUpDate).toISOString().split('T')[0] : '')
    }
  }, [lead, setValue])

  const onSubmit = async (data: z.infer<typeof editLeadSchema>) => {
    setIsLoading(true)
    try {
      // Clean up empty strings to null
      const cleanedData = {
        ...data,
        email: data.email || null,
        companyName: data.companyName || null,
        industryName: data.industryName || null,
        shortDescription: data.shortDescription || null,
        followUpDate: data.followUpDate || null,
      }

      const response = await fetch(`/api/leads/${lead.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleanedData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update lead')
      }

      toast({
        title: 'Success',
        description: 'Lead updated successfully!',
      })

      onLeadUpdated()
    } catch (error) {
      console.error('Lead update error:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update lead',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center">
            <Edit className="h-5 w-5 mr-2" />
            Edit Lead
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">Customer Name <span className="text-red-500">*</span></Label>
              <Input
                id="customerName"
                {...register('customerName')}
                placeholder="Enter customer name"
                className="h-11"
              />
              {errors.customerName && (
                <p className="text-sm text-red-600">{errors.customerName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobile">Mobile Number <span className="text-red-500">*</span></Label>
              <Input
                id="mobile"
                type="tel"
                {...register('mobile')}
                placeholder="Enter mobile number (e.g., 9876543210)"
                className="h-11"
              />
              {errors.mobile && (
                <p className="text-sm text-red-600">{errors.mobile.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email ID <span className="text-gray-500">(Optional)</span></Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              placeholder="Enter email address"
              className="h-11"
            />
            {errors.email && (
              <p className="text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name <span className="text-gray-500">(Optional)</span></Label>
              <Input
                id="companyName"
                {...register('companyName')}
                placeholder="Enter company name"
                className="h-11"
              />
              {errors.companyName && (
                <p className="text-sm text-red-600">{errors.companyName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="industryName">Industry Name <span className="text-gray-500">(Optional)</span></Label>
              <Input
                id="industryName"
                {...register('industryName')}
                placeholder="Enter industry name"
                className="h-11"
              />
              {errors.industryName && (
                <p className="text-sm text-red-600">{errors.industryName.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="followUpDate">Follow-up Date <span className="text-gray-500">(Optional)</span></Label>
            <Input
              id="followUpDate"
              type="date"
              {...register('followUpDate')}
              className="h-11"
            />
            {errors.followUpDate && (
              <p className="text-sm text-red-600">{errors.followUpDate.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="shortDescription">Short Description <span className="text-gray-500">(Optional)</span></Label>
            <Textarea
              id="shortDescription"
              {...register('shortDescription')}
              placeholder="Enter short description"
              className="min-h-[80px] resize-none"
            />
            {errors.shortDescription && (
              <p className="text-sm text-red-600">{errors.shortDescription.message}</p>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Updating...' : 'Update Lead'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
