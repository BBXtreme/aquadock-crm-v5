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
import { Upload, FileText, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
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

const landMapping: Record<string, string> = {
  'Germany': 'DE',
  'Deutschland': 'DE',
  'France': 'FR',
  'Frankreich': 'FR',
  // Füge bei Bedarf weitere Mappings hinzu
}

const stripEmojis = (str: string): string =>
  str.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<ParsedRow[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [mappings, setMappings] = useState<Record<string, string>>({})
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState<{ success: number; errors: number; companyIds: string[] } | null>(null)
  const [isFileValid, setIsFileValid] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) {
      setFile(null)
      setParsedData([])
      setHeaders([])
      setIsFileValid(false)
      return
    }

    setFile(selectedFile)
    setImporting(false)
    setResults(null)

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      // Fixed: korrekte Typisierung mit Papa.ParseResult<T> aus @types/papaparse
      complete: (results: Papa.ParseResult<ParsedRow>) => {
        try {
          // 1. Parsing-Fehler prüfen
          if (results.errors.length > 0) {
            toast.error(`CSV-Parsing-Fehler: ${results.errors[0].message}`)
            setIsFileValid(false)
            return
          }

          // 2. Leere Datei prüfen
          if (results.data.length === 0) {
            toast.warning('Die CSV-Datei enthält keine Daten')
            setIsFileValid(false)
            return
          }

          // 3. Erste Zeile prüfen (Header vorhanden?)
          const firstRow = results.data[0]
          if (!firstRow || Object.keys(firstRow).length === 0) {
            toast.warning('Keine gültigen Spalten in der CSV gefunden')
            setIsFileValid(false)
            return
          }

          // Alles ok → Daten setzen
          setParsedData(results.data as ParsedRow[])
          setHeaders(Object.keys(firstRow))
          setIsFileValid(true)
          toast.success(`${results.data.length} Zeilen erfolgreich geladen`)
        } catch (err: any) {
          toast.error(`Unerwarteter Fehler beim Verarbeiten: ${err.message || 'Unbekannt'}`)
          setIsFileValid(false)
        }
      },
      error: (error) => {
        toast.error(`Datei-Lesefehler: ${error.message || 'Unbekannt'}`)
        setIsFileValid(false)
      },
    })
  }

  const handleMappingChange = (csvColumn: string, field: string) => {
    setMappings((prev) => ({ ...prev, [csvColumn]: field }))
  }

  const parseValue = (value: string | undefined): number => {
    if (!value || value.trim() === '') return 0
    const cleaned = stripEmojis(value).replace(/[^\d.,-]/g, '').replace(',', '.')
    const num = parseFloat(cleaned)
    return isNaN(num) ? 0 : num
  }

  const mapLand = (land: string | undefined): string => {
    if (!land) return 'Unbekannt'
    return landMapping[land.trim()] || land.trim() || 'Unbekannt'
  }

  const handleImport = async () => {
    if (!parsedData.length || Object.keys(mappings).length === 0 || !isFileValid) {
      toast.warning('Keine gültigen Daten oder Zuordnungen vorhanden')
      return
    }

    setImporting(true)
    setResults(null)
    let successCount = 0
    let errorCount = 0
    const companyIds: string[] = []

    for (const [index, row] of parsedData.entries()) {
      try {
        const mappedRow: Partial<MappedRow> = {}

        // Mapping anwenden – mit Fallbacks
        Object.entries(mappings).forEach(([csvCol, field]) => {
          const value = row[csvCol]?.trim()
          if (!value) return

          if (field === 'value' || field === 'wasserdistanz' || field === 'lat' || field === 'lon') {
            mappedRow[field as keyof MappedRow] = parseValue(value)
          } else if (field === 'land') {
            mappedRow[field] = mapLand(value)
          } else {
            mappedRow[field as keyof MappedRow] = stripEmojis(value)
          }
        })

        // Pflichtfelder validieren – früh abbrechen
        if (!mappedRow.firmenname?.trim() || !mappedRow.kundentyp?.trim()) {
          throw new Error(`Zeile ${index + 1}: Firmenname oder Kundentyp fehlt`)
        }

        // Firma einfügen
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .insert({
            firmenname: mappedRow.firmenname!.trim(),
            kundentyp: mappedRow.kundentyp!.trim(),
            status: mappedRow.status?.trim() || 'lead',
            value: mappedRow.value || 0,
            stadt: mappedRow.stadt?.trim(),
            land: mappedRow.land?.trim(),
            wasserdistanz: mappedRow.wasserdistanz,
            wassertyp: mappedRow.wassertyp?.trim(),
            lat: mappedRow.lat,
            lon: mappedRow.lon,
          })
          .select('id')
          .single()

        if (companyError) throw companyError

        companyIds.push(company.id)

        // Kontakt einfügen, falls Daten vorhanden
        if (mappedRow.vorname?.trim() || mappedRow.nachname?.trim() || mappedRow.email?.trim()) {
          const { error: contactError } = await supabase
            .from('contacts')
            .insert({
              company_id: company.id,
              vorname: mappedRow.vorname?.trim(),
              nachname: mappedRow.nachname?.trim(),
              email: mappedRow.email?.trim(),
              telefon: mappedRow.telefon?.trim(),
              position: mappedRow.position?.trim(),
              primary: true,
            })

          if (contactError) throw contactError
        }

        successCount++
        toast.success(`Zeile ${index + 1}: ${mappedRow.firmenname} importiert`)
      } catch (error: any) {
        console.error(`Fehler in Zeile ${index + 1}:`, error)
        toast.error(`Fehler Zeile ${index + 1}: ${error.message || 'Unbekannt'}`)
        errorCount++
      }
    }

    setResults({
      success: successCount,
      errors: errorCount,
      companyIds,
    })

    setImporting(false)

    if (successCount > 0) {
      toast.success(`${successCount} Firmen erfolgreich importiert`)
    } else {
      toast.error('Import fehlgeschlagen – alle Zeilen hatten Fehler')
    }
  }

  return (
    <div className="container mx-auto p-6 lg:p-8 space-y-8 max-w-7xl">
      <div>
        <p className="text-sm text-muted-foreground">Home {'>'} Import</p>
        <h1 className="text-3xl font-semibold tracking-tight">CSV-Import</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            CSV-Datei hochladen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <Label htmlFor="csvFile" className="mb-2 block">
                CSV-Datei auswählen
              </Label>
              <Input
                id="csvFile"
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                disabled={importing}
              />
            </div>

            {file && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>{file.name}</span>
                <span>({parsedData.length} Zeilen)</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {parsedData.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Spalten zuordnen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {headers.map((header) => (
                  <div key={header} className="space-y-2">
                    <Label htmlFor={`map-${header}`} className="text-sm font-medium">
                      {header}
                    </Label>
                    <Select
                      disabled={importing}
                      onValueChange={(value) => handleMappingChange(header, value)}
                    >
                      <SelectTrigger id={`map-${header}`}>
                        <SelectValue placeholder="Feld zuordnen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="firmenname">Firmenname</SelectItem>
                        <SelectItem value="kundentyp">Kundentyp</SelectItem>
                        <SelectItem value="status">Status</SelectItem>
                        <SelectItem value="value">Wert</SelectItem>
                        <SelectItem value="stadt">Stadt</SelectItem>
                        <SelectItem value="land">Land</SelectItem>
                        <SelectItem value="wasserdistanz">Wasserdistanz</SelectItem>
                        <SelectItem value="wassertyp">Wassertyp</SelectItem>
                        <SelectItem value="lat">Latitude</SelectItem>
                        <SelectItem value="lon">Longitude</SelectItem>
                        <SelectItem value="vorname">Vorname (Kontakt)</SelectItem>
                        <SelectItem value="nachname">Nachname (Kontakt)</SelectItem>
                        <SelectItem value="email">E-Mail (Kontakt)</SelectItem>
                        <SelectItem value="telefon">Telefon (Kontakt)</SelectItem>
                        <SelectItem value="position">Position (Kontakt)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Vorschau (erste 5 Zeilen)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {headers.map((header) => (
                        <TableHead key={header} className="whitespace-nowrap">
                          {header}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.slice(0, 5).map((row, index) => (
                      <TableRow key={index}>
                        {headers.map((header) => (
                          <TableCell key={header} className="whitespace-nowrap">
                            {row[header] || <span className="text-muted-foreground">-</span>}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              onClick={handleImport}
              disabled={importing || Object.keys(mappings).length === 0 || !isFileValid}
              className="bg-[#24BACC] hover:bg-[#1da0a8] text-white min-w-[180px]"
            >
              {importing ? (
                <>
                  <span className="animate-spin mr-2">↻</span>
                  Importiere...
                </>
              ) : (
                'Daten importieren'
              )}
            </Button>
          </div>
        </>
      )}

      {results && (
        <Card>
          <CardHeader>
            <CardTitle>Import-Ergebnisse</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="flex items-center text-green-600">
                  <CheckCircle className="mr-2 h-5 w-5" />
                  {results.success} erfolgreich
                </div>
                <div className="flex items-center text-red-600">
                  <XCircle className="mr-2 h-5 w-5" />
                  {results.errors} Fehler
                </div>
              </div>

              {results.companyIds.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-3">Importierte Firmen:</p>
                  <div className="flex flex-wrap gap-2">
                    {results.companyIds.map((id) => (
                      <Link key={id} href={`/companies/${id}`}>
                        <Button variant="outline" size="sm">
                          Firma {id.slice(0, 8)} anzeigen
                        </Button>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {results.errors > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Einige Zeilen konnten nicht importiert werden. Überprüfen Sie die Konsolenausgabe für Details.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}