import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ReportColumn } from './report-config';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: typeof autoTable;
    lastAutoTable: { finalY: number };
  }
}

// Type for column styles in autoTable
interface ColumnStyle {
  cellWidth: number;
  valign: 'middle' | 'top' | 'bottom';
  halign?: 'left' | 'center' | 'right';
  fontStyle?: 'normal' | 'bold';
}

// Type definitions for PDF export
export type PDFDataRow = Record<string, unknown>;
export type PDFSummaryData = Record<string, unknown>;
export type PDFFilterData = Record<string, unknown>;
export type PDFOrientation = 'portrait' | 'landscape';
export type PDFPageSize = 'a4' | 'a3' | 'letter';

export interface PDFExportOptions {
  title: string;
  subtitle?: string;
  columns: ReportColumn[];
  data: PDFDataRow[];
  summary?: PDFSummaryData;
  filters?: PDFFilterData;
  orientation?: PDFOrientation;
  pageSize?: PDFPageSize;
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

  private addFiltersSection(filters: PDFFilterData) {
    if (!filters || Object.keys(filters).length === 0) return;

    // Filter section header with background
    this.doc.setFillColor(248, 249, 250); // Light gray background
    this.doc.rect(this.margin - 5, this.currentY - 3, this.pageWidth - (this.margin * 2) + 10, 20, 'F');

    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(52, 58, 64); // Dark gray
    this.doc.text('Applied Filters', this.margin, this.currentY + 5);
    this.currentY += 15;

    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(73, 80, 87); // Medium gray

    const filterEntries = Object.entries(filters).filter(([key, value]) =>
      value && value !== 'all' && value !== '' && key !== 'categoryNames'
    );

    if (filterEntries.length === 0) {
      this.doc.text('No filters applied', this.margin + 5, this.currentY);
      this.currentY += 6;
    } else {
      filterEntries.forEach(([key, value]) => {
        const displayValue = this.formatFilterValue(key, value, filters);
        const filterLabel = this.formatFilterKey(key);

        // Filter label in bold
        this.doc.setFont('helvetica', 'bold');
        this.doc.text(`${filterLabel}:`, this.margin + 5, this.currentY);

        // Filter value in normal weight
        this.doc.setFont('helvetica', 'normal');
        const labelWidth = this.doc.getTextWidth(`${filterLabel}: `);
        this.doc.text(displayValue, this.margin + 5 + labelWidth, this.currentY);

        this.currentY += 5;
      });
    }

    this.doc.setTextColor(0, 0, 0); // Reset to black
    this.currentY += 10;
  }

  private formatFilterValue(key: string, value: unknown, allFilters?: PDFFilterData): string {
    // Handle date ranges
    if (value && typeof value === 'object' && !Array.isArray(value) && 'from' in value && 'to' in value) {
      const dateRange = value as { from: string; to: string };
      const fromDate = new Date(dateRange.from).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
      const toDate = new Date(dateRange.to).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
      return `${fromDate} - ${toDate}`;
    }

    // Handle category filters - use categoryNames if available
    if (key === 'categoryId' || key === 'category') {
      if (allFilters?.categoryNames && Array.isArray(allFilters.categoryNames)) {
        return allFilters.categoryNames.join(', ');
      }
    }

    // Handle arrays (like categories)
    if (Array.isArray(value)) {
      return value.map(item => {
        // If it's a category object with name, use the name
        if (typeof item === 'object' && item.name) {
          return item.name;
        }
        // If it's just a string, use it directly
        return String(item);
      }).join(', ');
    }

    // Handle single date values
    if (key.toLowerCase().includes('date') && value) {
      try {
        if (typeof value === 'string' || typeof value === 'number' || value instanceof Date) {
          return new Date(value).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          });
        }
        return String(value);
      } catch {
        return String(value);
      }
    }

    // Handle status values with proper formatting
    if (key.toLowerCase().includes('status')) {
      if (Array.isArray(value)) {
        return value.map(status =>
          String(status).replace(/([A-Z])/g, ' $1').trim()
        ).join(', ');
      }
      return String(value).replace(/([A-Z])/g, ' $1').trim();
    }

    return String(value);
  }

  private formatFilterKey(key: string): string {
    const keyMappings: { [key: string]: string } = {
      'dateRange': 'Date Range',
      'categoryId': 'Category',
      'category': 'Category',
      'status': 'Status',
      'borrowerName': 'Borrower',
      'consumerName': 'Consumer',
      'actorName': 'Person',
      'borrower': 'Borrower',
      'consumer': 'Consumer',
      'person': 'Person',
      'itemType': 'Item Type',
      'stockStatus': 'Stock Status',
      'transactionType': 'Transaction Type',
      'projectName': 'Project',
      'purpose': 'Purpose'
    };

    return keyMappings[key] || key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase());
  }

  private addSummarySection(summary: PDFSummaryData) {
    if (!summary || Object.keys(summary).length === 0) return;

    // Summary section header with background
    this.doc.setFillColor(233, 236, 239); // Light blue-gray background
    this.doc.rect(this.margin - 5, this.currentY - 3, this.pageWidth - (this.margin * 2) + 10, 20, 'F');

    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(52, 58, 64);
    this.doc.text('Report Summary', this.margin, this.currentY + 5);
    this.currentY += 18;

    // Create professional summary table
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
        fillColor: [30, 58, 138], // Professional dark blue
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 11,
        cellPadding: { top: 5, right: 8, bottom: 5, left: 8 }
      },
      bodyStyles: {
        fontSize: 10,
        cellPadding: { top: 4, right: 8, bottom: 4, left: 8 },
        textColor: [33, 37, 41],
        lineColor: [222, 226, 230],
        lineWidth: 0.5
      },
      alternateRowStyles: {
        fillColor: [248, 249, 250]
      },
      columnStyles: {
        0: {
          cellWidth: 80,
          halign: 'left',
          fontStyle: 'bold'
        },
        1: {
          cellWidth: 60,
          halign: 'right',
          fontStyle: 'normal'
        }
      },
      styles: {
        lineColor: [222, 226, 230],
        lineWidth: 0.5
      },
      margin: { left: this.margin }
    });

    this.doc.setTextColor(0, 0, 0); // Reset color
    this.currentY = this.doc.lastAutoTable.finalY + 15;
  }

  private formatSummaryValue(value: unknown): string {
    if (typeof value === 'number') {
      return value.toLocaleString('id-ID');
    }
    return String(value);
  }

  private addDataTable(columns: ReportColumn[], data: PDFDataRow[]) {
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
      theme: 'grid',
      headStyles: {
        fillColor: [30, 58, 138], // Professional dark blue
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 11,
        cellPadding: { top: 6, right: 4, bottom: 6, left: 4 },
        halign: 'center',
        valign: 'middle'
      },
      bodyStyles: {
        fontSize: 9,
        cellPadding: { top: 4, right: 4, bottom: 4, left: 4 },
        textColor: [33, 37, 41], // Dark gray for better readability
        lineColor: [222, 226, 230], // Light gray borders
        lineWidth: 0.5
      },
      alternateRowStyles: {
        fillColor: [248, 249, 250] // Very light gray for alternating rows
      },
      columnStyles: this.getColumnStyles(columns, columnWidths),
      styles: {
        overflow: 'linebreak',
        cellWidth: 'wrap',
        font: 'helvetica',
        lineColor: [222, 226, 230],
        lineWidth: 0.5
      },
      margin: { left: this.margin, right: this.margin },
      didDrawPage: (data) => {
        // Professional page footer
        const pageCount = this.doc.getNumberOfPages();
        const currentPage = data.pageNumber;

        // Footer line
        this.doc.setDrawColor(222, 226, 230);
        this.doc.setLineWidth(0.5);
        this.doc.line(this.margin, this.pageHeight - 20, this.pageWidth - this.margin, this.pageHeight - 20);

        // Page number
        this.doc.setFontSize(9);
        this.doc.setFont('helvetica', 'normal');
        this.doc.setTextColor(108, 117, 125); // Muted gray
        this.doc.text(
          `Page ${currentPage} of ${pageCount}`,
          this.pageWidth - this.margin - 25,
          this.pageHeight - 12
        );

        // Company footer
        this.doc.text(
          'ToolFlow Management System',
          this.margin,
          this.pageHeight - 12
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

  private getColumnStyles(columns: ReportColumn[], widths: number[]): { [key: number]: ColumnStyle } {
    const styles: { [key: number]: ColumnStyle } = {};

    columns.forEach((col, index) => {
      const baseStyle: ColumnStyle = {
        cellWidth: widths[index],
        valign: 'middle'
      };

      // Set alignment based on column type
      switch (col.type) {
        case 'number':
        case 'currency':
          baseStyle.halign = 'right';
          baseStyle.fontStyle = 'normal';
          break;
        case 'date':
          baseStyle.halign = 'center';
          baseStyle.fontStyle = 'normal';
          break;
        case 'status':
        case 'badge':
          baseStyle.halign = 'center';
          baseStyle.fontStyle = 'bold';
          break;
        case 'text':
        default:
          baseStyle.halign = col.key === 'id' ? 'center' : 'left';
          baseStyle.fontStyle = col.key === 'id' ? 'bold' : 'normal';
          break;
      }

      styles[index] = baseStyle;
    });

    return styles;
  }

  private formatCellValue(value: unknown, column: ReportColumn, row: PDFDataRow): string {
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
        if (typeof value === 'string' || typeof value === 'number' || value instanceof Date) {
          return new Date(value).toLocaleDateString('id-ID');
        }
        return String(value);
      
      case 'status':
      case 'badge':
        return String(value).toUpperCase();
      
      case 'list':
        if (!Array.isArray(value)) return String(value);
        return value.map(item => {
          if (typeof item === 'string') return item;
          if (typeof item === 'object' && item !== null) {
            // Extract meaningful text from item objects
            return item.name || item.toolName || item.materialName ||
                   `${item.toolName || item.materialName || 'Item'} (${item.quantity || 1}x)` ||
                   String(item);
          }
          return String(item);
        }).join(', ');
      
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
      filters
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
