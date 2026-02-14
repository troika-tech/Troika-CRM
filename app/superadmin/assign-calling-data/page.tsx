'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ModernSidebar } from '@/components/modern-sidebar'
import { Header } from '@/components/header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { Upload, FileText, Clipboard, Users, Eye, History, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface CallingDataRow {
  name: string
  number: string
  companyName: string
  designation: string
  status: string
}

export default function AssignCallingDataPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const [uploadMethod, setUploadMethod] = useState<'paste' | 'file'>('paste')
  const [pasteData, setPasteData] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [availableUsers, setAvailableUsers] = useState<Array<{ id: string; name: string | null; email: string }>>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [previewData, setPreviewData] = useState<CallingDataRow[]>([])
  const [assignmentHistory, setAssignmentHistory] = useState<any[]>([])
  const [historyPage, setHistoryPage] = useState(1)
  const [historyPagination, setHistoryPagination] = useState({ page: 1, pageSize: 10, total: 0, totalPages: 0 })
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [viewingAssignment, setViewingAssignment] = useState<any | null>(null)
  const [showViewDialog, setShowViewDialog] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'SUPERADMIN') {
      router.push('/dashboard')
    }
  }, [status, session, router])

  useEffect(() => {
    if (session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPERADMIN') {
      fetchAvailableUsers()
      fetchAssignmentHistory()
    }
  }, [session, historyPage])

  const fetchAssignmentHistory = async () => {
    setLoadingHistory(true)
    try {
      const response = await fetch(`/api/calling-data/assignments?page=${historyPage}&pageSize=10`)
      if (response.ok) {
        const data = await response.json()
        setAssignmentHistory(data.data)
        setHistoryPagination(data.pagination)
      } else {
        const error = await response.json()
        console.error('Error fetching assignment history:', error)
        toast({
          title: 'Error',
          description: `Failed to load assignment history: ${error.details || error.error || 'Unknown error'}`,
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error fetching assignment history:', error)
      toast({
        title: 'Error',
        description: 'Failed to load assignment history. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleViewAssignment = (assignment: any) => {
    setViewingAssignment(assignment)
    setShowViewDialog(true)
  }

  const handleExportAssignment = (assignment: any) => {
    if (!assignment || !assignment.records || assignment.records.length === 0) {
      toast({
        title: 'Error',
        description: 'No records to export',
        variant: 'destructive',
      })
      return
    }

    // Create CSV headers
    const headers = ['Name', 'Number', 'Company Name', 'Designation', 'Status']
    
    // Create CSV rows
    const csvRows = assignment.records.map((record: any) => [
      record.name || '',
      record.number || '',
      record.companyName || '',
      record.designation || '',
      record.status || 'No Status',
    ])

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...csvRows.map((row: any[]) => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    
    // Generate filename
    const assignedToName = (assignment.assignedTo.name || assignment.assignedTo.email || 'user').replace(/[^a-z0-9]/gi, '_')
    const date = new Date(assignment.createdAt).toISOString().split('T')[0]
    a.download = `assignment_${assignedToName}_${date}.csv`
    
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)

    toast({
      title: 'Success',
      description: `Exported ${assignment.records.length} records successfully`,
    })
  }

  const fetchAvailableUsers = async () => {
    try {
      const response = await fetch('/api/users/available')
      if (response.ok) {
        const data = await response.json()
        setAvailableUsers(data.users || [])
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const parseCSV = (text: string): CallingDataRow[] => {
    const lines = text.trim().split('\n')
    if (lines.length === 0) return []

    // Check if first line is header
    const hasHeader = lines[0].toLowerCase().includes('name') && 
                     (lines[0].toLowerCase().includes('number') || lines[0].toLowerCase().includes('mobile'))
    const dataLines = hasHeader ? lines.slice(1) : lines

    return dataLines
      .map(line => {
        // Handle CSV with quotes
        const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
        return {
          name: values[0] || '',
          number: values[1] || '',
          companyName: values[2] || '',
          designation: values[3] || '',
          status: values[4] || ''
        }
      })
      .filter(row => row.name && row.number)
  }

  const parseExcel = async (file: File): Promise<CallingDataRow[]> => {
    const XLSX = await import('xlsx')
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][]

    if (jsonData.length === 0) return []

    // Check if first row is header
    const hasHeader = jsonData[0]?.some((cell: any) => 
      String(cell).toLowerCase().includes('name')
    )
    const dataRows = hasHeader ? jsonData.slice(1) : jsonData

    return dataRows
      .map(row => ({
        name: String(row[0] || ''),
        number: String(row[1] || ''),
        companyName: String(row[2] || ''),
        designation: String(row[3] || ''),
        status: String(row[4] || '')
      }))
      .filter(row => row.name && row.number)
  }

  const handlePasteChange = (value: string) => {
    setPasteData(value)
    if (value.trim()) {
      const parsed = parseCSV(value)
      setPreviewData(parsed)
    } else {
      setPreviewData([])
    }
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setSelectedFile(file)
    
    try {
      if (file.name.endsWith('.csv')) {
        const text = await file.text()
        const parsed = parseCSV(text)
        setPreviewData(parsed)
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const parsed = await parseExcel(file)
        setPreviewData(parsed)
      } else {
        toast({
          title: 'Error',
          description: 'Please upload a CSV or Excel file',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to parse file. Please check the format.',
        variant: 'destructive',
      })
    }
  }

  const handleSubmit = async () => {
    if (!selectedUserId) {
      toast({
        title: 'Error',
        description: 'Please select a user to assign the data to',
        variant: 'destructive',
      })
      return
    }

    if (previewData.length === 0) {
      toast({
        title: 'Error',
        description: 'No data to upload. Please paste data or upload a file.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/calling-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: previewData,
          assignedToId: selectedUserId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to upload data')
      }

      toast({
        title: 'Success',
        description: `Successfully assigned ${previewData.length} records to user`,
      })

      // Reset form
      setPasteData('')
      setSelectedFile(null)
      setSelectedUserId('')
      setPreviewData([])
      const fileInput = document.getElementById('file-upload') as HTMLInputElement
      if (fileInput) fileInput.value = ''
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to upload data',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPERADMIN')) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <ModernSidebar />
        
        <div className="flex-1 flex flex-col ml-64">
          <Header />
          
          <div className="flex-1 p-6">
            <div className="max-w-7xl mx-auto">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Assign Data For Calling</h1>
                <p className="text-gray-600">Upload and assign calling data to users</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Upload Section */}
                <Card>
                  <CardHeader>
                    <CardTitle>Upload Data</CardTitle>
                    <CardDescription>
                      Choose how to upload your data: paste CSV or upload Excel/CSV file
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Upload Method Selection */}
                    <div className="flex space-x-2">
                      <Button
                        type="button"
                        variant={uploadMethod === 'paste' ? 'default' : 'outline'}
                        onClick={() => setUploadMethod('paste')}
                        className="flex-1"
                      >
                        <Clipboard className="mr-2 h-4 w-4" />
                        Copy & Paste
                      </Button>
                      <Button
                        type="button"
                        variant={uploadMethod === 'file' ? 'default' : 'outline'}
                        onClick={() => setUploadMethod('file')}
                        className="flex-1"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Upload File
                      </Button>
                    </div>

                    {/* Paste Method */}
                    {uploadMethod === 'paste' && (
                      <div className="space-y-2">
                        <Label>Paste CSV Data</Label>
                        <Textarea
                          value={pasteData}
                          onChange={(e) => handlePasteChange(e.target.value)}
                          placeholder="Name, Number, Company Name, Designation, Status&#10;John Doe, 9876543210, ABC Corp, Manager, Active&#10;Jane Smith, 9876543211, XYZ Ltd, Director, Active"
                          rows={8}
                          className="font-mono text-sm"
                        />
                        <p className="text-xs text-gray-500">
                          Format: Name, Number, Company Name, Designation, Status (one per line)
                        </p>
                      </div>
                    )}

                    {/* File Upload Method */}
                    {uploadMethod === 'file' && (
                      <div className="space-y-2">
                        <Label>Upload Excel or CSV File</Label>
                        <Input
                          id="file-upload"
                          type="file"
                          accept=".csv,.xlsx,.xls"
                          onChange={handleFileChange}
                          className="cursor-pointer"
                        />
                        <p className="text-xs text-gray-500">
                          Supported formats: CSV, Excel (.xlsx, .xls)
                          <br />
                          Required columns: Name, Number, Company Name, Designation, Status
                        </p>
                      </div>
                    )}

                    {/* User Selection */}
                    <div className="space-y-2">
                      <Label htmlFor="user-select">Assign To User <span className="text-red-500">*</span></Label>
                      <Select
                        value={selectedUserId}
                        onValueChange={setSelectedUserId}
                      >
                        <SelectTrigger id="user-select" className="h-11">
                          <SelectValue placeholder="Select user to assign data" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableUsers.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name || 'No name'} ({user.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Submit Button */}
                    <Button
                      onClick={handleSubmit}
                      disabled={isSubmitting || previewData.length === 0 || !selectedUserId}
                      className="w-full"
                    >
                      {isSubmitting ? 'Uploading...' : `Assign ${previewData.length} Records`}
                    </Button>
                  </CardContent>
                </Card>

                {/* Preview Section */}
                <Card>
                  <CardHeader>
                    <CardTitle>Data Preview</CardTitle>
                    <CardDescription>
                      {previewData.length > 0 
                        ? `Preview of ${previewData.length} records` 
                        : 'No data to preview'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {previewData.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-2">Name</th>
                              <th className="text-left p-2">Number</th>
                              <th className="text-left p-2">Company</th>
                              <th className="text-left p-2">Designation</th>
                              <th className="text-left p-2">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {previewData.slice(0, 10).map((row, index) => (
                              <tr key={index} className="border-b">
                                <td className="p-2">{row.name}</td>
                                <td className="p-2">{row.number}</td>
                                <td className="p-2">{row.companyName || '-'}</td>
                                <td className="p-2">{row.designation || '-'}</td>
                                <td className="p-2">{row.status || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {previewData.length > 10 && (
                          <p className="text-xs text-gray-500 mt-2">
                            Showing first 10 of {previewData.length} records
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-400">
                        <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Upload data to see preview</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Assignment History Section */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <History className="mr-2 h-5 w-5" />
                    Assignment History
                  </CardTitle>
                  <CardDescription>
                    View all calling data assignments and their status
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingHistory ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                      <p className="mt-2 text-gray-600">Loading history...</p>
                    </div>
                  ) : assignmentHistory.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No assignment history yet</p>
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-3 font-semibold text-gray-700">Assigned By</th>
                              <th className="text-left p-3 font-semibold text-gray-700">Assigned To</th>
                              <th className="text-left p-3 font-semibold text-gray-700">Records</th>
                              <th className="text-left p-3 font-semibold text-gray-700">Date</th>
                              <th className="text-left p-3 font-semibold text-gray-700">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {assignmentHistory.map((assignment) => (
                              <tr key={assignment.id} className="border-b hover:bg-gray-50">
                                <td className="p-3">
                                  {assignment.assignedBy.name || assignment.assignedBy.email}
                                </td>
                                <td className="p-3">
                                  {assignment.assignedTo.name || assignment.assignedTo.email}
                                </td>
                                <td className="p-3">{assignment.recordCount}</td>
                                <td className="p-3 text-gray-600">
                                  {new Date(assignment.createdAt).toLocaleDateString()}
                                </td>
                                <td className="p-3">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleViewAssignment(assignment)}
                                  >
                                    <Eye className="mr-2 h-4 w-4" />
                                    View
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination */}
                      {historyPagination.totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4 pt-4 border-t">
                          <p className="text-sm text-gray-600">
                            Showing {(historyPage - 1) * historyPagination.pageSize + 1} to{' '}
                            {Math.min(historyPage * historyPagination.pageSize, historyPagination.total)} of{' '}
                            {historyPagination.total} results
                          </p>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setHistoryPage(historyPage - 1)}
                              disabled={historyPage === 1}
                            >
                              <ChevronLeft className="h-4 w-4" />
                              Previous
                            </Button>
                            <span className="text-sm text-gray-600">
                              Page {historyPage} of {historyPagination.totalPages}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setHistoryPage(historyPage + 1)}
                              disabled={historyPage >= historyPagination.totalPages}
                            >
                              Next
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* View Assignment Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Assignment Details</DialogTitle>
                <DialogDescription>
                  Status of all records assigned on {viewingAssignment && new Date(viewingAssignment.createdAt).toLocaleDateString()}
                </DialogDescription>
              </div>
              {viewingAssignment && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleExportAssignment(viewingAssignment)}
                  className="ml-4"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              )}
            </div>
          </DialogHeader>
          {viewingAssignment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-semibold">Assigned By:</span>{' '}
                  {viewingAssignment.assignedBy.name || viewingAssignment.assignedBy.email}
                </div>
                <div>
                  <span className="font-semibold">Assigned To:</span>{' '}
                  {viewingAssignment.assignedTo.name || viewingAssignment.assignedTo.email}
                </div>
                <div>
                  <span className="font-semibold">Total Records:</span> {viewingAssignment.recordCount}
                </div>
                <div>
                  <span className="font-semibold">Date:</span>{' '}
                  {new Date(viewingAssignment.createdAt).toLocaleString()}
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Records Status</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 font-semibold">Name</th>
                        <th className="text-left p-2 font-semibold">Number</th>
                        <th className="text-left p-2 font-semibold">Company</th>
                        <th className="text-left p-2 font-semibold">Designation</th>
                        <th className="text-left p-2 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewingAssignment.records.map((record: any) => (
                        <tr key={record.id} className="border-b">
                          <td className="p-2">{record.name}</td>
                          <td className="p-2">{record.number}</td>
                          <td className="p-2">{record.companyName || '-'}</td>
                          <td className="p-2">{record.designation || '-'}</td>
                          <td className="p-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              record.status === 'Interested' || record.status === 'Converted'
                                ? 'bg-green-100 text-green-800'
                                : record.status === 'Not Interested' || record.status === 'Rejected' || record.status === 'Do Not Call'
                                ? 'bg-red-100 text-red-800'
                                : record.status === 'Follow Up' || record.status === 'Call Back'
                                ? 'bg-yellow-100 text-yellow-800'
                                : record.status
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {record.status || 'No Status'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

