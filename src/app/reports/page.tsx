'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  FileText,
  Filter,
  BarChart3,
  AlertCircle,
  ArrowLeft,
  Settings
} from 'lucide-react';

// Import new components and configurations
import { ReportTypeSelector } from '@/components/reports/ReportTypeSelector';
import { DynamicFilters } from '@/components/reports/DynamicFilters';
import { UnifiedReportPreview } from '@/components/reports/UnifiedReportPreview';
import { getIconComponent } from '@/lib/icon-registry';
import {
  getReportConfig,
  populateFilterOptions,
  validateFilters,
  ReportTypeConfig,
  FilterValues,
  ListItem
} from '@/lib/report-config';

// New unified interfaces for the revolutionary system
interface DateRange {
  from: string;
  to: string;
}

interface ReportFilters {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  dateRange?: DateRange;
  category?: string | string[];
  status?: string | string[];
  borrower?: string;
  consumer?: string;
  person?: string;
  actorName?: string;
  [key: string]: unknown;
}

interface ReportSummary {
  totalRecords?: number;
  totalValue?: number;
  averageValue?: number;
  [key: string]: unknown;
}

interface UnifiedReportData {
  type: string;
  dateRange: DateRange;
  filters: ReportFilters;
  summary: ReportSummary;
  data: Record<string, unknown>[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  generatedAt: string;
}

// Component-specific types for proper typing
interface DateRangeFilter {
  from: string;
  to: string;
}

type FilterValue = string | number | string[] | DateRangeFilter | null;

interface Filters {
  [key: string]: FilterValue;
}

type CellValue = string | number | Date | null | undefined | ListItem[];

interface ReportDataRow {
  [key: string]: CellValue;
}

interface ComponentReportSummary {
  [key: string]: string | number | null;
}

interface AppliedFilters {
  [key: string]: string | number | string[] | { from: string; to: string } | null;
}

// Application state management
interface ReportState {
  step: 'select-type' | 'configure-filters' | 'preview-results';
  selectedReportType: string | null;
  reportConfig: ReportTypeConfig | null;
  filters: ReportFilters;
  reportData: UnifiedReportData | null;
  isLoading: boolean;
  error: string | null;
}

// Revolutionary unified API functions
const generateUnifiedReport = async (
  reportType: string,
  filters: ReportFilters,
  format: 'json' | 'csv' | 'excel' = 'json'
): Promise<{ success: boolean; data?: UnifiedReportData; blob?: Blob; error?: string }> => {
  try {
    const config = getReportConfig(reportType);
    if (!config) {
      throw new Error('Invalid report type');
    }

    // Transform filters to API format
    const apiFilters: Record<string, unknown> = {
      type: config.apiEndpoint,
      format,
      page: filters.page || 1,
      limit: filters.limit || 50,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder || 'desc'
    };

    // Handle date range
    if (filters.dateRange) {
      if (filters.dateRange.from) {
        apiFilters.dateFrom = new Date(filters.dateRange.from).toISOString();
      }
      if (filters.dateRange.to) {
        apiFilters.dateTo = new Date(filters.dateRange.to).toISOString();
      }
    }

    // Handle category filters (FIXED: Full multi-select support)
    if (filters.category && Array.isArray(filters.category) && filters.category.length > 0) {
      // Filter out 'all' values and send as array
      const validCategories = filters.category.filter((cat: unknown) => cat !== 'all');
      if (validCategories.length > 0) {
        apiFilters.categoryIds = validCategories; // Use categoryIds for arrays
      }
    } else if (filters.category && filters.category !== 'all') {
      apiFilters.categoryId = filters.category; // Single category
    }

    // Handle status filters (FIXED: Multi-select support)
    if (filters.status && Array.isArray(filters.status) && filters.status.length > 0) {
      // Filter out 'all' values and send as array
      const validStatuses = filters.status.filter((status: unknown) => status !== 'all');
      if (validStatuses.length > 0) {
        apiFilters.status = validStatuses; // Send as array
      }
    } else if (filters.status && filters.status !== 'all') {
      apiFilters.status = filters.status; // Single status
    }
    if (filters.borrower) {
      apiFilters.borrowerName = filters.borrower;
    }
    if (filters.consumer) {
      apiFilters.consumerName = filters.consumer;
    }
    if (filters.person) {
      apiFilters.actorName = filters.person;
    }

    // Debug logging
    console.log('Sending API request:', {
      reportType: config.value,
      apiEndpoint: config.apiEndpoint,
      apiFilters
    });

    const response = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apiFilters)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    if (format === 'json') {
      const result = await response.json();
      return { success: true, data: result.data };
    } else {
      const blob = await response.blob();
      return { success: true, blob };
    }
  } catch (error) {
    console.error('Error generating report:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate report'
    };
  }
};


// Revolutionary Reports Component
export default function Reports() {
  // State management for the new system
  const [reportState, setReportState] = useState<ReportState>({
    step: 'select-type',
    selectedReportType: null,
    reportConfig: null,
    filters: {},
    reportData: null,
    isLoading: false,
    error: null
  });

  const [sortBy, setSortBy] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

// Handler functions for the new revolutionary system
  // Handler functions for the new revolutionary system
  const handleReportTypeSelect = async (reportType: string) => {
    try {
      setReportState(prev => ({ ...prev, isLoading: true, error: null }));

      // Get and populate report configuration
      const config = await populateFilterOptions(reportType);

      // Initialize default filters based on configuration
      const defaultFilters: ReportFilters = {
        page: 1,
        limit: 50,
        sortBy: config.defaultSort.key,
        sortOrder: config.defaultSort.order
      };

      config.filters.forEach(filter => {
        if (filter.type === 'multiselect') {
          defaultFilters[filter.key] = [];
        } else if (filter.type === 'daterange') {
          if (filter.required) {
            // Set default date range for required date filters
            defaultFilters[filter.key] = {
              from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              to: new Date().toISOString().split('T')[0]
            };
          } else {
            defaultFilters[filter.key] = { from: '', to: '' };
          }
        } else {
          defaultFilters[filter.key] = filter.type === 'select' ? 'all' : '';
        }
      });

      setReportState(prev => ({
        ...prev,
        step: 'configure-filters',
        selectedReportType: reportType,
        reportConfig: config,
        filters: defaultFilters,
        isLoading: false
      }));

      setSortBy(config.defaultSort.key);
      setSortOrder(config.defaultSort.order);
    } catch (error) {
      console.error('Error selecting report type:', error);
      setReportState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to load report configuration'
      }));
    }
  };

  const handleFiltersChange = (newFilters: ReportFilters) => {
    setReportState(prev => ({
      ...prev,
      filters: { ...newFilters, sortBy, sortOrder },
      reportData: null // Clear previous data when filters change
    }));
  };

  const handleApplyFilters = async () => {
    if (!reportState.selectedReportType || !reportState.reportConfig) return;

    // Validate filters
    const validation = validateFilters(reportState.selectedReportType, reportState.filters as FilterValues);
    if (!validation.isValid) {
      setReportState(prev => ({
        ...prev,
        error: validation.errors.join(', ')
      }));
      return;
    }

    setReportState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await generateUnifiedReport(
        reportState.selectedReportType,
        { ...reportState.filters, sortBy, sortOrder },
        'json'
      );

      if (result.success && result.data) {
        setReportState(prev => ({
          ...prev,
          step: 'preview-results',
          reportData: result.data || null,
          isLoading: false
        }));
      } else {
        setReportState(prev => ({
          ...prev,
          isLoading: false,
          error: result.error || 'Failed to generate report'
        }));
      }
    } catch (error) {
      console.error('Error generating report:', error);
      setReportState(prev => ({
        ...prev,
        isLoading: false,
        error: 'An unexpected error occurred'
      }));
    }
  };

  const handleSort = (column: string) => {
    const newSortOrder = sortBy === column && sortOrder === 'asc' ? 'desc' : 'asc';
    setSortBy(column);
    setSortOrder(newSortOrder);

    // Re-apply filters with new sort
    if (reportState.step === 'preview-results') {
      handleApplyFilters();
    }
  };

  const handlePageChange = (page: number) => {
    const newFilters = { ...reportState.filters, page };
    setReportState(prev => ({ ...prev, filters: newFilters }));
    handleApplyFilters();
  };

  // const handleExportReport = (format: 'csv' | 'excel') => {
  //   if (reportState.selectedReportType) {
  //     handleExport(format, reportState.selectedReportType, reportState.filters);
  //   }
  // };

  const handleBackToTypeSelection = () => {
    setReportState({
      step: 'select-type',
      selectedReportType: null,
      reportConfig: null,
      filters: {},
      reportData: null,
      isLoading: false,
      error: null
    });
  };

  const handleBackToFilters = () => {
    setReportState(prev => ({
      ...prev,
      step: 'configure-filters',
      reportData: null
    }));
  };

  // Revolutionary render methods
  const renderStepIndicator = () => {
    const steps = [
      { key: 'select-type', label: 'Select Report Type', icon: FileText },
      { key: 'configure-filters', label: 'Configure Filters', icon: Filter },
      { key: 'preview-results', label: 'Preview Results', icon: BarChart3 }
    ];

    return (
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center space-x-4">
          {steps.map((step, index) => {
            const isActive = reportState.step === step.key;
            const isCompleted = steps.findIndex(s => s.key === reportState.step) > index;
            const IconComponent = step.icon;

            return (
              <div key={step.key} className="flex items-center">
                <div className={cn(
                  "flex items-center space-x-2 px-4 py-2 rounded-lg transition-all",
                  isActive && "bg-primary text-white",
                  isCompleted && "bg-green-100 text-green-800",
                  !isActive && !isCompleted && "bg-gray-100 text-gray-600"
                )}>
                  <IconComponent className="w-4 h-4" />
                  <span className="text-sm font-medium">{step.label}</span>
                </div>
                {index < steps.length - 1 && (
                  <div className={cn(
                    "w-8 h-0.5 mx-2",
                    isCompleted ? "bg-green-300" : "bg-gray-300"
                  )} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Main render method - Revolutionary step-based UI
  const renderCurrentStep = () => {
    switch (reportState.step) {
      case 'select-type':
        return (
          <ReportTypeSelector
            selectedType={reportState.selectedReportType || undefined}
            onTypeSelect={handleReportTypeSelect}
          />
        );

      case 'configure-filters':
        if (!reportState.reportConfig) return null;
        return (
          <div className="space-y-6">
            {/* Back Button */}
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={handleBackToTypeSelection}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Report Types</span>
              </Button>
            </div>

            {/* Selected Report Info */}
            <div className="bg-white rounded-xl border p-6">
              <div className="flex items-center space-x-4 mb-4">
                {(() => {
                  const IconComponent = getIconComponent(reportState.reportConfig.icon);
                  return (
                    <>
                      <div className={cn(
                        "p-3 rounded-lg",
                        reportState.reportConfig.color === 'blue' && "bg-blue-100",
                        reportState.reportConfig.color === 'green' && "bg-green-100",
                        reportState.reportConfig.color === 'purple' && "bg-purple-100",
                        reportState.reportConfig.color === 'orange' && "bg-orange-100",
                        reportState.reportConfig.color === 'indigo' && "bg-indigo-100"
                      )}>
                        <IconComponent className={cn(
                          "w-6 h-6",
                          reportState.reportConfig.color === 'blue' && "text-blue-600",
                          reportState.reportConfig.color === 'green' && "text-green-600",
                          reportState.reportConfig.color === 'purple' && "text-purple-600",
                          reportState.reportConfig.color === 'orange' && "text-orange-600",
                          reportState.reportConfig.color === 'indigo' && "text-indigo-600"
                        )} />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">{reportState.reportConfig.label}</h2>
                        <p className="text-gray-600">{reportState.reportConfig.description}</p>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Dynamic Filters */}
              <DynamicFilters
                reportConfig={reportState.reportConfig}
                filters={reportState.filters as Filters}
                onFiltersChange={handleFiltersChange}
                onApplyFilters={handleApplyFilters}
                isLoading={reportState.isLoading}
              />
            </div>

            {/* Error Display */}
            {reportState.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <p className="text-red-800">{reportState.error}</p>
                </div>
              </div>
            )}
          </div>
        );

      case 'preview-results':
        if (!reportState.reportConfig || !reportState.reportData) return null;
        return (
          <div className="space-y-6">
            {/* Navigation */}
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={handleBackToFilters}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Filters</span>
              </Button>

              <Button
                variant="outline"
                onClick={handleBackToTypeSelection}
                className="flex items-center space-x-2"
              >
                <Settings className="w-4 h-4" />
                <span>Change Report Type</span>
              </Button>
            </div>

            {/* Unified Report Preview */}
            <UnifiedReportPreview
              reportConfig={reportState.reportConfig}
              data={(reportState.reportData.data || []) as ReportDataRow[]}
              pagination={reportState.reportData.pagination}
              summary={reportState.reportData.summary as ComponentReportSummary}
              appliedFilters={reportState.filters as AppliedFilters}
              isLoading={reportState.isLoading}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
              onPageChange={handlePageChange}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground">Advanced Reports</h1>
        <p className="text-muted-foreground mt-2">
          Revolutionary dynamic reporting system with context-aware filtering
        </p>
      </div>

      {/* Step Indicator */}
      {renderStepIndicator()}

      {/* Main Content */}
      {renderCurrentStep()}
    </div>
  );
}
