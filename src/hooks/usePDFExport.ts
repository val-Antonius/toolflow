import { useState } from 'react';
import { PDFExporter, PDFExportOptions } from '@/lib/pdf-export';
import { ReportColumn } from '@/lib/report-config';

export interface ExportProgress {
  stage: 'preparing' | 'generating' | 'downloading' | 'complete' | 'error';
  message: string;
  progress: number;
}

export function usePDFExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);

  const updateProgress = (stage: ExportProgress['stage'], message: string, progress: number) => {
    setExportProgress({ stage, message, progress });
  };

  const exportToPDF = async (
    reportTitle: string,
    reportSubtitle: string,
    columns: ReportColumn[],
    data: any[],
    summary?: { [key: string]: any },
    filters?: { [key: string]: any },
    orientation: 'portrait' | 'landscape' = 'landscape'
  ) => {
    try {
      setIsExporting(true);
      updateProgress('preparing', 'Preparing export data...', 10);

      // Create filename based on report title and current date
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${reportTitle.replace(/\s+/g, '_')}_${timestamp}`;

      updateProgress('generating', 'Generating PDF document...', 50);

      // Create PDF exporter
      const exporter = new PDFExporter(orientation);

      // Prepare export options
      const exportOptions: PDFExportOptions = {
        title: reportTitle,
        subtitle: reportSubtitle,
        columns,
        data,
        summary,
        filters,
        orientation
      };

      updateProgress('downloading', 'Downloading PDF file...', 90);

      // Generate and download PDF
      await exporter.downloadPDF(filename, exportOptions);

      updateProgress('complete', 'Export completed successfully!', 100);

      // Reset after a short delay
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(null);
      }, 2000);

    } catch (error) {
      console.error('PDF Export Error:', error);
      updateProgress('error', 'Failed to export PDF. Please try again.', 0);
      
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(null);
      }, 3000);
    }
  };

  const exportReportData = async (
    reportConfig: any,
    reportData: any,
    appliedFilters: any
  ) => {
    if (!reportData || !reportData.data || reportData.data.length === 0) {
      updateProgress('error', 'No data available to export.', 0);
      return;
    }

    // Prepare report title and subtitle
    const title = reportConfig.label;
    const subtitle = reportConfig.description;

    // Clean and format filters for display
    const cleanFilters: { [key: string]: any } = {};
    Object.entries(appliedFilters).forEach(([key, value]) => {
      // Skip internal/system filters
      if (['page', 'limit', 'sortBy', 'sortOrder'].includes(key)) return;
      
      if (value && value !== 'all' && value !== '') {
        cleanFilters[key] = value;
      }
    });

    // Determine orientation based on number of columns
    const orientation = reportConfig.columns.length > 6 ? 'landscape' : 'portrait';

    await exportToPDF(
      title,
      subtitle,
      reportConfig.columns,
      reportData.data,
      reportData.summary,
      cleanFilters,
      orientation
    );
  };

  return {
    isExporting,
    exportProgress,
    exportToPDF,
    exportReportData
  };
}
