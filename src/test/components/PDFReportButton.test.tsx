import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PDFReportButton } from '@/components/dashboard/PDFReportButton'
import { usePDFReport } from '@/services/pdfReportService'

// Mock do hook usePDFReport
vi.mock('@/services/pdfReportService', () => ({
  usePDFReport: vi.fn(() => ({
    generateReport: vi.fn(() => Promise.resolve()),
  })),
}))

// Mock do hook useToast
vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn(),
  })),
}))

describe('PDFReportButton', () => {
  it('renders the PDF report button', () => {
    render(<PDFReportButton />)
    
    expect(screen.getByText('Relatório PDF')).toBeInTheDocument()
  })

  it('opens dialog when clicked', async () => {
    render(<PDFReportButton />)
    
    const button = screen.getByText('Relatório PDF')
    fireEvent.click(button)
    
    await waitFor(() => {
      expect(screen.getByText('Gerar Relatório PDF')).toBeInTheDocument()
    })
  })

  it('shows current month and year by default', async () => {
    render(<PDFReportButton />)
    
    const button = screen.getByText('Relatório PDF')
    fireEvent.click(button)
    
    await waitFor(() => {
      const currentMonth = new Date().getMonth() + 1
      const currentYear = new Date().getFullYear()
      
      // Verifica se o mês atual está selecionado
      expect(screen.getByDisplayValue(currentMonth.toString())).toBeInTheDocument()
      // Verifica se o ano atual está selecionado
      expect(screen.getByDisplayValue(currentYear.toString())).toBeInTheDocument()
    })
  })

  it('calls generateReport when form is submitted', async () => {
    const mockGenerateReport = vi.fn(() => Promise.resolve())
    vi.mocked(usePDFReport).mockReturnValue({
      generateReport: mockGenerateReport,
    })

    render(<PDFReportButton />)
    
    const button = screen.getByText('Relatório PDF')
    fireEvent.click(button)
    
    await waitFor(() => {
      const generateButton = screen.getByText('Gerar Relatório')
      fireEvent.click(generateButton)
    })
    
    expect(mockGenerateReport).toHaveBeenCalled()
  })
})
