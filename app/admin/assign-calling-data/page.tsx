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
      }
    } catch (error) {
      console.error('Error fetching assignment history:', error)
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
                        variant={uploadMethod === 'paste' ? 'default' : 'outline'}
                        onClick={() => {
                          setUploadMethod('paste')
                          setPasteData('')
                          setSelectedFile(null)
                          setPreviewData([])
                        }}
                        className="flex-1"
                      >
                        <Clipboard className="mr-2 h-4 w-4" />
                        Paste CSV
                      </Button>
                      <Button
                        variant={uploadMethod === 'file' ? 'default' : 'outline'}
                        onClick={() => {
                          setUploadMethod('file')
                          setPasteData('')
                          setSelectedFile(null)
                          setPreviewData([])
                        }}
                        className="flex-1"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Upload File
                      </Button>
                    </div>

                    {uploadMethod === 'paste' ? (
                      <div className="space-y-2">
                        <Label htmlFor="paste-data">Paste CSV Data</Label>
                        <Textarea
                          id="paste-data"
                          placeholder="Name, Number, Company Name, Designation, Status&#10;John Doe, 1234567890, ABC Corp, Manager, Interested"
                          value={pasteData}
                          onChange={(e) => handlePasteChange(e.target.value)}
                          rows={8}
                          className="font-mono text-sm"
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label htmlFor="file-upload">Upload CSV or Excel File</Label>
                        <Input
                          id="file-upload"
                          type="file"
                          accept=".csv,.xlsx,.xls"
                          onChange={handleFileChange}
                        />
                        {selectedFile && (
                          <p className="text-sm text-gray-600">
                            Selected: {selectedFile.name}
                          </p>
                        )}
                      </div>
                    )}

                    {previewData.length > 0 && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          Preview: {previewData.length} records found
                        </p>
                        <div className="max-h-40 overflow-y-auto">
                          <table className="min-w-full text-xs">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left p-1">Name</th>
                                <th className="text-left p-1">Number</th>
                                <th className="text-left p-1">Company</th>
                              </tr>
                            </thead>
                            <tbody>
                              {previewData.slice(0, 5).map((row, idx) => (
                                <tr key={idx} className="border-b">
                                  <td className="p-1">{row.name}</td>
                                  <td className="p-1">{row.number}</td>
                                  <td className="p-1">{row.companyName}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="user-select">Assign To User</Label>
                      <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                        <SelectTrigger id="user-select">
                          <SelectValue placeholder="Select a user" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableUsers.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name || user.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      onClick={handleSubmit}
                      disabled={isSubmitting || previewData.length === 0 || !selectedUserId}
                      className="w-full"
                    >
                      {isSubmitting ? 'Assigning...' : `Assign ${previewData.length} Records`}
                    </Button>
                  </CardContent>
                </Card>

                {/* Assignment History Section */}
                <Card>
                  <CardHeader>
                    <CardTitle>Assignment History</CardTitle>
                    <CardDescription>
                      View your calling data assignments and their status
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingHistory ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                      </div>
                    ) : assignmentHistory.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <History className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <p>No assignments yet</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          {assignmentHistory.map((assignment: any) => (
                            <div
                              key={assignment.id}
                              className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900">
                                    {assignment.assignedTo.name || assignment.assignedTo.email}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    {assignment.records.length} records • {new Date(assignment.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                                <div className="flex space-x-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleViewAssignment(assignment)}
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    View
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleExportAssignment(assignment)}
                                  >
                                    <Download className="h-4 w-4 mr-1" />
                                    Export
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {historyPagination.totalPages > 1 && (
                          <div className="flex items-center justify-between pt-4 border-t">
                            <p className="text-sm text-gray-600">
                              Page {historyPagination.page} of {historyPagination.totalPages}
                            </p>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                                disabled={historyPage === 1}
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setHistoryPage(p => Math.min(historyPagination.totalPages, p + 1))}
                                disabled={historyPage === historyPagination.totalPages}
                              >
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* View Assignment Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assignment Details</DialogTitle>
            <DialogDescription>
              View all records assigned to {viewingAssignment?.assignedTo?.name || viewingAssignment?.assignedTo?.email}
            </DialogDescription>
          </DialogHeader>
          {viewingAssignment && (
            <div className="mt-4">
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  <strong>Assigned To:</strong> {viewingAssignment.assignedTo.name || viewingAssignment.assignedTo.email}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Date:</strong> {new Date(viewingAssignment.createdAt).toLocaleString()}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Total Records:</strong> {viewingAssignment.records.length}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Number</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Designation</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {viewingAssignment.records.map((record: any, idx: number) => (
                      <tr key={idx}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{record.name || '-'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{record.number || '-'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{record.companyName || '-'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{record.designation || '-'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
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
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
