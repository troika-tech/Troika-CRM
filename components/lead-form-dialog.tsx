'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { leadSchema, LeadInput } from '@/lib/validators'
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
import { Textarea } from '@/components/ui/textarea'

interface LeadFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onLeadAdded: () => void
}

export function LeadFormDialog({ open, onOpenChange, onLeadAdded }: LeadFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
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
      onOpenChange(false)
      onLeadAdded()
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

  const handleCancel = () => {
    reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Add New Lead</DialogTitle>
          <DialogDescription>
            Enter the customer details to create a new lead.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              {...register('mobile')}
              placeholder="Enter 10-digit mobile number"
              className="h-11"
            />
            {errors.mobile && (
              <p className="text-sm text-red-600">{errors.mobile.message}</p>
            )}
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
              placeholder="Enter a brief description of the lead or message"
              rows={3}
              className="min-h-[88px]"
            />
            {errors.shortDescription && (
              <p className="text-sm text-red-600">{errors.shortDescription.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Lead'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
