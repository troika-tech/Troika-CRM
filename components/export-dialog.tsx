'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Download, Filter } from 'lucide-react'

interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  isAdmin?: boolean
}

interface ExportFilters {
  search: string
  owner: string
  dateFrom: string
  dateTo: string
  sort: string
}

export function ExportDialog({ open, onOpenChange, isAdmin = false }: ExportDialogProps) {
  const [isExporting, setIsExporting] = useState(false)
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ExportFilters>({
    defaultValues: {
      search: '',
      owner: '',
      dateFrom: '',
      dateTo: '',
      sort: 'createdAt:desc'
    }
  })

  const onSubmit = async (data: ExportFilters) => {
    setIsExporting(true)
    try {
      const params = new URLSearchParams({
        search: data.search,
        sort: data.sort,
        dateFrom: data.dateFrom,
        dateTo: data.dateTo,
      })

      if (isAdmin) {
        params.append('all', 'true')
        if (data.owner) {
          params.append('owner', data.owner)
        }
      }

      const response = await fetch(`/api/leads/export?${params}`)
      
      if (!response.ok) {
        throw new Error('Export failed')
      }

      // Create blob and download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      
      // Get filename from response headers or use default
      const contentDisposition = response.headers.get('content-disposition')
      const filename = contentDisposition 
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `leads_export_${new Date().toISOString().split('T')[0]}.csv`
      
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: 'Success',
        description: 'Data exported successfully!',
      })

      onOpenChange(false)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export data. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleCancel = () => {
    reset()
    onOpenChange(false)
  }

  const quickExport = async () => {
    setIsExporting(true)
    try {
      const params = new URLSearchParams({
        sort: 'createdAt:desc'
      })

      if (isAdmin) {
        params.append('all', 'true')
      }

      const response = await fetch(`/api/leads/export?${params}`)
      
      if (!response.ok) {
        throw new Error('Export failed')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `leads_export_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: 'Success',
        description: 'Data exported successfully!',
      })

      onOpenChange(false)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export data. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Download className="mr-2 h-5 w-5" />
            Export Data
          </DialogTitle>
          <DialogDescription>
            Export leads data to CSV with optional filtering options.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quick Export */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Export</CardTitle>
              <CardDescription>
                Export all data without any filters
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={quickExport}
                disabled={isExporting}
                className="w-full"
              >
                <Download className="mr-2 h-4 w-4" />
                {isExporting ? 'Exporting...' : 'Export All Data'}
              </Button>
            </CardContent>
          </Card>

          {/* Advanced Export */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Filter className="mr-2 h-4 w-4" />
                Advanced Export
              </CardTitle>
              <CardDescription>
                Apply filters before exporting
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="search">Search Term</Label>
                    <Input
                      id="search"
                      {...register('search')}
                      placeholder="Search by name, email, or mobile"
                    />
                  </div>

                  {isAdmin && (
                    <div className="space-y-2">
                      <Label htmlFor="owner">Owner Email</Label>
                      <Input
                        id="owner"
                        {...register('owner')}
                        placeholder="Filter by owner email"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="dateFrom">From Date</Label>
                    <Input
                      id="dateFrom"
                      type="date"
                      {...register('dateFrom')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dateTo">To Date</Label>
                    <Input
                      id="dateTo"
                      type="date"
                      {...register('dateTo')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sort">Sort By</Label>
                    <select
                      id="sort"
                      {...register('sort')}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="createdAt:desc">Created Date (Newest First)</option>
                      <option value="createdAt:asc">Created Date (Oldest First)</option>
                      <option value="customerName:asc">Customer Name (A-Z)</option>
                      <option value="customerName:desc">Customer Name (Z-A)</option>
                      <option value="email:asc">Email (A-Z)</option>
                      <option value="email:desc">Email (Z-A)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isExporting}>
                    <Download className="mr-2 h-4 w-4" />
                    {isExporting ? 'Exporting...' : 'Export with Filters'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
