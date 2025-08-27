import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ReportColumn } from './report-config';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: typeof autoTable;
  }
}

export interface PDFExportOptions {
  title: string;
  subtitle?: string;
  columns: ReportColumn[];
  data: any[];
  summary?: { [key: string]: any };
  filters?: { [key: string]: any };
  orientation?: 'portrait' | 'landscape';
  pageSize?: 'a4' | 'a3' | 'letter';
}

export class PDFExporter {
  private doc: jsPDF;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number = 20;
  private currentY: number = 20;

  constructor(orientation: 'portrait' | 'landscape' = 'landscape', pageSize: 'a4' | 'a3' | 'letter' = 'a4') {
    this.doc = new jsPDF({
      orientation,
      unit: 'mm',
      format: pageSize
    });

    // Set page dimensions
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
  }

  private addHeader(title: string, subtitle?: string) {
    // Header background
    this.doc.setFillColor(52, 73, 94); // Dark blue-gray
    this.doc.rect(0, 0, this.pageWidth, 35, 'F');

    // Company/App Header
    this.doc.setTextColor(255, 255, 255); // White text
    this.doc.setFontSize(22);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('DISA Inventory Management', this.margin, 15);

    // System subtitle
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text('Professional Inventory Management System', this.margin, 25);

    // Reset text color
    this.doc.setTextColor(0, 0, 0);
    this.currentY = 45;

    // Report Title
    this.doc.setFontSize(18);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title, this.margin, this.currentY);

    this.currentY += 10;

    if (subtitle) {
      this.doc.setFontSize(12);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(100, 100, 100);
      this.doc.text(subtitle, this.margin, this.currentY);
      this.doc.setTextColor(0, 0, 0);
      this.currentY += 8;
    }

    // Date and time with better formatting
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(100, 100, 100);
    const now = new Date();
    const dateStr = `Generated on: ${now.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })} at ${now.toLocaleTimeString('id-ID')}`;
    this.doc.text(dateStr, this.margin, this.currentY);
    this.doc.setTextColor(0, 0, 0);

    this.currentY += 15;
  }

  private addFiltersSection(filters: { [key: string]: any }) {
    if (!filters || Object.keys(filters).length === 0) return;

    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Applied Filters:', this.margin, this.currentY);
    this.currentY += 6;

    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');

    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'all' && value !== '') {
        let displayValue = value;
        
        // Format different types of values
        if (Array.isArray(value)) {
          displayValue = value.join(', ');
        } else if (typeof value === 'object' && value.from && value.to) {
          displayValue = `${value.from} to ${value.to}`;
        }

        const filterText = `${this.formatFilterKey(key)}: ${displayValue}`;
        this.doc.text(filterText, this.margin + 5, this.currentY);
        this.currentY += 4;
      }
    });

    this.currentY += 8;
  }

  private formatFilterKey(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .replace('Date Range', 'Date Range')
      .replace('Category', 'Category')
      .replace('Status', 'Status');
  }

  private addSummarySection(summary: { [key: string]: any }) {
    if (!summary || Object.keys(summary).length === 0) return;

    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Summary:', this.margin, this.currentY);
    this.currentY += 8;

    // Create summary table
    const summaryData = Object.entries(summary).map(([key, value]) => [
      this.formatFilterKey(key),
      this.formatSummaryValue(value)
    ]);

    autoTable(this.doc, {
      startY: this.currentY,
      head: [['Metric', 'Value']],
      body: summaryData,
      theme: 'grid',
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 10,
        cellPadding: 3
      },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 40, halign: 'right' }
      },
      margin: { left: this.margin }
    });

    this.currentY = (this.doc as any).lastAutoTable.finalY + 15;
  }

  private formatSummaryValue(value: any): string {
    if (typeof value === 'number') {
      return value.toLocaleString('id-ID');
    }
    return String(value);
  }

  private addDataTable(columns: ReportColumn[], data: any[]) {
    if (!data || data.length === 0) {
      this.doc.setFontSize(12);
      this.doc.text('No data available for the selected filters.', this.margin, this.currentY);
      return;
    }

    // Prepare table headers
    const headers = columns.map(col => col.label);

    // Prepare table data
    const tableData = data.map(row => 
      columns.map(col => this.formatCellValue(row[col.key], col, row))
    );

    // Calculate column widths based on content and available space
    const availableWidth = this.pageWidth - (this.margin * 2);
    const columnWidths = this.calculateColumnWidths(columns, availableWidth);

    autoTable(this.doc, {
      startY: this.currentY,
      head: [headers],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [52, 73, 94],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 10
      },
      bodyStyles: {
        fontSize: 9,
        cellPadding: 2
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      columnStyles: this.getColumnStyles(columns, columnWidths),
      styles: {
        overflow: 'linebreak',
        cellWidth: 'wrap'
      },
      margin: { left: this.margin, right: this.margin },
      didDrawPage: (data) => {
        // Add page numbers
        const pageCount = this.doc.getNumberOfPages();
        const currentPage = data.pageNumber;
        
        this.doc.setFontSize(8);
        this.doc.text(
          `Page ${currentPage} of ${pageCount}`,
          this.pageWidth - this.margin - 20,
          this.pageHeight - 10
        );
      }
    });
  }

  private calculateColumnWidths(columns: ReportColumn[], availableWidth: number): number[] {
    const totalFlexWeight = columns.reduce((sum, col) => {
      if (col.width) {
        return sum; // Fixed width columns don't contribute to flex
      }
      // Assign weights based on column type
      switch (col.type) {
        case 'text': return sum + 3;
        case 'number': return sum + 2;
        case 'currency': return sum + 2;
        case 'date': return sum + 2;
        case 'status': return sum + 1.5;
        case 'badge': return sum + 1.5;
        default: return sum + 2;
      }
    }, 0);

    let remainingWidth = availableWidth;
    const widths: number[] = [];

    columns.forEach(col => {
      if (col.width) {
        const fixedWidth = parseInt(col.width.replace('px', '')) * 0.264583; // Convert px to mm
        widths.push(fixedWidth);
        remainingWidth -= fixedWidth;
      } else {
        widths.push(0); // Will be calculated later
      }
    });

    // Distribute remaining width among flex columns
    columns.forEach((col, index) => {
      if (!col.width) {
        const weight = col.type === 'text' ? 3 : 
                      col.type === 'number' || col.type === 'currency' || col.type === 'date' ? 2 :
                      col.type === 'status' || col.type === 'badge' ? 1.5 : 2;
        widths[index] = (remainingWidth * weight) / totalFlexWeight;
      }
    });

    return widths;
  }

  private getColumnStyles(columns: ReportColumn[], widths: number[]): { [key: number]: any } {
    const styles: { [key: number]: any } = {};
    
    columns.forEach((col, index) => {
      styles[index] = {
        cellWidth: widths[index],
        halign: col.type === 'number' || col.type === 'currency' ? 'right' : 'left'
      };
    });

    return styles;
  }

  private formatCellValue(value: any, column: ReportColumn, row: any): string {
    if (value === null || value === undefined) return '-';

    // Use custom render function if available
    if (column.render && typeof column.render === 'function') {
      // For PDF, we need to extract text content from React elements
      const rendered = column.render(value, row);
      if (typeof rendered === 'string') return rendered;
      if (typeof rendered === 'number') return rendered.toString();
      // For React elements, extract text content (simplified)
      return String(value);
    }

    switch (column.type) {
      case 'currency':
        return new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR'
        }).format(Number(value));
      
      case 'number':
        return Number(value).toLocaleString('id-ID');
      
      case 'date':
        return new Date(value).toLocaleDateString('id-ID');
      
      case 'status':
      case 'badge':
        return String(value).toUpperCase();
      
      case 'list':
        return Array.isArray(value) ? value.join(', ') : String(value);
      
      default:
        return String(value);
    }
  }

  public async exportToPDF(options: PDFExportOptions): Promise<Blob> {
    const {
      title,
      subtitle,
      columns,
      data,
      summary,
      filters,
      orientation = 'landscape',
      pageSize = 'a4'
    } = options;

    // Reset position
    this.currentY = 20;

    // Add header
    this.addHeader(title, subtitle);

    // Add filters section
    if (filters) {
      this.addFiltersSection(filters);
    }

    // Add summary section
    if (summary) {
      this.addSummarySection(summary);
    }

    // Add data table
    this.addDataTable(columns, data);

    // Return PDF as blob
    return new Promise((resolve) => {
      const pdfBlob = this.doc.output('blob');
      resolve(pdfBlob);
    });
  }

  public downloadPDF(filename: string, options: PDFExportOptions) {
    this.exportToPDF(options).then(blob => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });
  }
}
