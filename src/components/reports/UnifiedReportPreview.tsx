'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ReportTypeConfig, ReportColumn } from '@/lib/report-config';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  FileText,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface UnifiedReportPreviewProps {
  reportConfig: ReportTypeConfig;
  data: any[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  summary?: any;
  isLoading?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (column: string) => void;
  onPageChange?: (page: number) => void;
  onExport?: (format: 'csv' | 'excel') => void;
}

export function UnifiedReportPreview({
  reportConfig,
  data,
  pagination,
  summary,
  isLoading = false,
  sortBy,
  sortOrder = 'desc',
  onSort,
  onPageChange,
  onExport
}: UnifiedReportPreviewProps) {
  
  const renderCellContent = (column: ReportColumn, value: any, row: any) => {
    if (column.render) {
      return column.render(value, row);
    }

    switch (column.type) {
      case 'date':
        return value ? new Date(value).toLocaleDateString('id-ID') : '-';
      case 'currency':
        return value ? `Rp ${value.toLocaleString('id-ID')}` : '-';
      case 'number':
        return value?.toLocaleString('id-ID') || '-';
      case 'status':
        return (
          <Badge className="text-xs">
            {value}
          </Badge>
        );
      case 'list':
        if (!value || !Array.isArray(value)) return '-';
        return (
          <div className="space-y-1">
            {value.slice(0, 2).map((item: any, idx: number) => (
              <div key={idx} className="text-xs text-gray-600">
                {item.name || item.toolName || item.materialName}
                {item.quantity && ` (${item.quantity}x)`}
              </div>
            ))}
            {value.length > 2 && (
              <div className="text-xs text-gray-500">
                +{value.length - 2} more
              </div>
            )}
          </div>
        );
      default:
        return value || '-';
    }
  };

  const renderSortIcon = (column: ReportColumn) => {
    if (!column.sortable || !onSort) return null;

    const isActive = sortBy === column.key;
    
    if (isActive) {
      return sortOrder === 'asc' ? 
        <ArrowUp className="w-4 h-4 ml-1" /> : 
        <ArrowDown className="w-4 h-4 ml-1" />;
    }
    
    return <ArrowUpDown className="w-4 h-4 ml-1 opacity-50" />;
  };

  const renderPagination = () => {
    if (!pagination || !onPageChange) return null;

    const { page, totalPages, hasNext, hasPrev, total } = pagination;
    
    return (
      <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <span>
            Showing {((page - 1) * pagination.limit) + 1} to {Math.min(page * pagination.limit, total)} of {total} results
          </span>
        </div>
        
        <div className="flex items-center space-x-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(1)}
            disabled={!hasPrev}
            className="h-8 w-8 p-0"
          >
            <ChevronsLeft className="w-4 h-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={!hasPrev}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <div className="flex items-center space-x-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              
              return (
                <Button
                  key={pageNum}
                  variant={pageNum === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPageChange(pageNum)}
                  className="h-8 w-8 p-0"
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={!hasNext}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(totalPages)}
            disabled={!hasNext}
            className="h-8 w-8 p-0"
          >
            <ChevronsRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  };

  const renderSummaryCards = () => {
    if (!summary) return null;

    const summaryItems = Object.entries(summary).map(([key, value]) => ({
      key,
      label: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
      value: typeof value === 'number' ? value.toLocaleString('id-ID') : value
    }));

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {summaryItems.slice(0, 4).map((item) => (
          <div key={item.key} className="bg-white rounded-lg border p-4">
            <div className="flex items-center space-x-2 mb-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-gray-600">{item.label}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{item.value}</p>
          </div>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border">
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Generating report...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl border">
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No data found for the selected filters</p>
              <p className="text-sm text-gray-500 mt-1">Try adjusting your filter criteria</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {renderSummaryCards()}

      {/* Report Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{reportConfig.label}</h3>
              <p className="text-sm text-gray-600 mt-1">{reportConfig.description}</p>
            </div>
            
            {onExport && reportConfig.supportsExport && (
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onExport('csv')}
                  className="h-8"
                >
                  <Download className="w-4 h-4 mr-2" />
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onExport('excel')}
                  className="h-8"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Excel
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                {reportConfig.columns.map((column) => (
                  <th
                    key={column.key}
                    className={cn(
                      "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
                      column.sortable && onSort && "cursor-pointer hover:bg-gray-100",
                      column.width && `w-[${column.width}]`
                    )}
                    onClick={() => column.sortable && onSort && onSort(column.key)}
                  >
                    <div className="flex items-center">
                      {column.label}
                      {renderSortIcon(column)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((row, index) => (
                <tr key={row.id || index} className="hover:bg-gray-50">
                  {reportConfig.columns.map((column) => (
                    <td
                      key={column.key}
                      className="px-4 py-3 text-sm text-gray-900"
                    >
                      {renderCellContent(column, row[column.key], row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {renderPagination()}
      </div>
    </div>
  );
}
