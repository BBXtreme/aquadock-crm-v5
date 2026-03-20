'use client'

import { useState } from 'react'
import Papa from 'papaparse'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Upload, FileText, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface ParsedRow {
  [key: string]: string
}

interface MappedRow {
  firmenname: string
  kundentyp: string
  status: string
  value: number
  stadt: string
  land: string
  wasserdistanz?: number
  wassertyp?: string
  lat?: number
  lon?: number
  vorname?: string
  nachname?: string
  email?: string
  telefon?: string
  position?: string
}

const landMapping: { [key: string]: string } = {
  'Germany': 'DE',
  'Deutschland': 'DE',
  'France': 'FR',
  'Frankreich': 'FR',
  // Add more mappings as needed
}

const stripEmojis = (str: string) => str.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<ParsedRow[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [mappings, setMappings] = useState<{ [key: string]: string }>({})
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState<{ success: number; errors: number; companyIds: string[] } | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results: Papa.ParseResult<ParsedRow>) => {
        if (results.errors.length > 0) {
          toast.error(`CSV parsing error: ${results.errors[0].message}`)
          return
        }

        if (results.data.length === 0) {
          toast.warning('The CSV file is empty')
          return
        }

        setParsedData(results.data)
        setHeaders(Object.keys(results.data[0] || {}))
        toast.success(`${results.data.length} rows loaded successfully`)
      },
      error: (error) => {
        toast.error(`Parsing failed: ${error.message}`)
      },
    })
  }

  const handleMappingChange = (csvColumn: string, field: string) => {
    setMappings(prev => ({ ...prev, [csvColumn]: field }))
  }

  const parseValue = (value: string): number => {
    if (!value) return 0
    const cleaned = stripEmojis(value).replace(/[^\d.,-]/g, '').replace(',', '.')
    const num = parseFloat(cleaned)
    return isNaN(num) ? 0 : num
  }

  const mapLand = (land: string): string => {
    return landMapping[land] || land || 'Unknown'
  }

  const handleImport = async () => {
    if (!parsedData.length || Object.keys(mappings).length === 0) {
      toast.warning('No data or mappings available')
      return
    }

    setImporting(true)
    let successCount = 0
    let errorCount = 0
    const companyIds: string[] = []

    for (const row of parsedData) {
      try {
        const mappedRow: Partial<MappedRow> = {}

        Object.entries(mappings).forEach(([csvCol, field]) => {
          const value = row[csvCol]?.trim() || ''
          if (field === 'value' || field === 'wasserdistanz' || field === 'lat' || field === 'lon') {
            mappedRow[field as keyof MappedRow] = parseValue(value)
          } else if (field === 'land') {
            mappedRow[field] = mapLand(value)
          } else {
            mappedRow[field as keyof MappedRow] = stripEmojis(value)
          }
        })

        // Validate required fields
        if (!mappedRow.firmenname || !mappedRow.kundentyp) {
          throw new Error('Company name or customer type missing')
        }

        const { data: company, error: companyError } = await supabase
          .from('companies')
          .insert({
            firmenname: mappedRow.firmenname!,
            kundentyp: mappedRow.kundentyp!,
            status: mappedRow.status || 'lead',
            value: mappedRow.value || 0,
            stadt: mappedRow.stadt,
            land: mappedRow.land,
            wasserdistanz: mappedRow.wasserdistanz,
            wassertyp: mappedRow.wassertyp,
            lat: mappedRow.lat,
            lon: mappedRow.lon,
          })
          .select()
          .single()

        if (companyError) throw companyError

        companyIds.push(company.id)

        // Insert contact if data available
        if (mappedRow.vorname || mappedRow.nachname || mappedRow.email) {
          const { error: contactError } = await supabase
            .from('contacts')
            .insert({
              company_id: company.id,
              vorname: mappedRow.vorname,
              nachname: mappedRow.nachname,
              email: mappedRow.email,
              telefon: mappedRow.telefon,
              position: mappedRow.position,
              primary: true,
            })

          if (contactError) throw contactError
        }

        successCount++
        toast.success(`Company "${mappedRow.firmenname}" imported`)
      } catch (error: any) {
        console.error('Import error:', error)
        toast.error(`Error on row: ${error.message || 'Unknown'}`)
        errorCount++
      }
    }

    setResults({ success: successCount, errors: errorCount, companyIds })
    setImporting(false)

    if (successCount > 0) {
      toast.success(`${successCount} companies imported successfully!`)
    } else {
      toast.error('No successful imports – all rows failed')
    }
  }

  return (
    <div className="container mx-auto p-6 lg:p-8 space-y-8">
      <div>
        <p className="text-sm text-muted-foreground">Home {'>'} Import</p>
        <h1 className="text-3xl font-semibold tracking-tight">CSV Import</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Upload className="mr-2 h-5 w-5" />
            Upload CSV File
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="csvFile">Select CSV File</Label>
              <Input
                id="csvFile"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
              />
            </div>
            {file && (
              <p className="text-sm text-muted-foreground">
                <FileText className="inline mr-1 h-4 w-4" />
                {file.name} ({parsedData.length} rows)
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {parsedData.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Column Mapping</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {headers.map((header) => (
                  <div key={header} className="space-y-2">
                    <Label>{header}</Label>
                    <Select onValueChange={(value) => handleMappingChange(header, value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="firmenname">Company Name</SelectItem>
                        <SelectItem value="kundentyp">Customer Type</SelectItem>
                        <SelectItem value="status">Status</SelectItem>
                        <SelectItem value="value">Value</SelectItem>
                        <SelectItem value="stadt">City</SelectItem>
                        <SelectItem value="land">Country</SelectItem>
                        <SelectItem value="wasserdistanz">Water Distance</SelectItem>
                        <SelectItem value="wassertyp">Water Type</SelectItem>
                        <SelectItem value="lat">Latitude</SelectItem>
                        <SelectItem value="lon">Longitude</SelectItem>
                        <SelectItem value="vorname">First Name (Contact)</SelectItem>
                        <SelectItem value="nachname">Last Name (Contact)</SelectItem>
                        <SelectItem value="email">Email (Contact)</SelectItem>
                        <SelectItem value="telefon">Phone (Contact)</SelectItem>
                        <SelectItem value="position">Position (Contact)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preview (First 5 Rows)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {headers.map((header) => (
                        <TableHead key={header}>{header}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.slice(0, 5).map((row, index) => (
                      <TableRow key={index}>
                        {headers.map((header) => (
                          <TableCell key={header}>{row[header] || '-'}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between items-center">
            <Button
              onClick={handleImport}
              disabled={importing || Object.keys(mappings).length === 0}
              className="bg-[#24BACC] hover:bg-[#1da0a8] text-white"
            >
              {importing ? 'Importing...' : 'Import Data'}
            </Button>
          </div>
        </>
      )}

      {results && (
        <Card>
          <CardHeader>
            <CardTitle>Import Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center text-green-600">
                  <CheckCircle className="mr-2 h-5 w-5" />
                  {results.success} successful
                </div>
                <div className="flex items-center text-red-600">
                  <XCircle className="mr-2 h-5 w-5" />
                  {results.errors} errors
                </div>
              </div>
              {results.companyIds.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">New companies:</p>
                  <div className="flex flex-wrap gap-2">
                    {results.companyIds.map((id) => (
                      <Link key={id} href={`/companies/${id}`}>
                        <Button variant="outline" size="sm">
                          View Company {id.slice(0, 8)}
                        </Button>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}