'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  FileText,
  Download,
  Filter,
  BarChart3,
  PieChart,
  TrendingUp,
  Package,
  Calendar,
  AlertCircle
} from 'lucide-react';

interface ReportFilter {
  reportType: string;
  dateRange: { from: string; to: string };
  itemType: string;
  category: string;
  status: string;
}

interface ReportData {
  type: string;
  dateRange: {
    from: string;
    to: string;
  };
  summary: any;
  data: any[];
  generatedAt: string;
}

// API functions
const generateReport = async (filters: ReportFilter, format: 'json' | 'csv' = 'json') => {
  try {
    const response = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: filters.reportType,
        dateFrom: filters.dateRange.from,
        dateTo: filters.dateRange.to,
        categoryId: filters.category !== 'all' ? filters.category : undefined,
        status: filters.status !== 'all' ? filters.status : undefined,
        format
      })
    });

    if (format === 'csv') {
      // Handle CSV download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filters.reportType}-report-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      return { success: true };
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error generating report:', error);
    return { success: false, error: 'Failed to generate report' };
  }
};

// Analytics functionality removed for now - can be added later

const reportTypes = [
  { value: 'borrowing', label: 'Borrowing Report', description: 'Active and completed tool borrowings' },
  { value: 'consuming', label: 'Consuming Report', description: 'Material consumption analytics' },
  { value: 'inventory', label: 'Inventory Status', description: 'Current stock levels and conditions' },
  { value: 'activity', label: 'Activity Summary', description: 'Combined activity overview' }
];

const itemTypes = [
  { value: 'all', label: 'All Items' },
  { value: 'tools', label: 'Tools Only' },
  { value: 'materials', label: 'Materials Only' }
];

const categories = [
  { value: 'all', label: 'All Categories' },
  { value: 'power-tools', label: 'Power Tools' },
  { value: 'hand-tools', label: 'Hand Tools' },
  { value: 'construction', label: 'Construction Materials' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'safety', label: 'Safety Equipment' }
];

const statusOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'in-stock', label: 'In Stock' },
  { value: 'low-stock', label: 'Low Stock' }
];

// Sample data removed - now using real API data

export default function Reports() {
  const [filters, setFilters] = useState<ReportFilter>({
    reportType: 'borrowing',
    dateRange: {
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      to: new Date().toISOString().split('T')[0]
    },
    itemType: 'all',
    category: 'all',
    status: 'all'
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);

  // Generate report when filters change
  useEffect(() => {
    const generateReportData = async () => {
      setIsGenerating(true);
      const result = await generateReport(filters, 'json');

      if (result.success) {
        setReportData(result.data);
      } else {
        console.error('Failed to generate report:', result.error);
        setReportData(null);
      }
      setIsGenerating(false);
    };

    generateReportData();
  }, [filters]);

  const handleFilterChange = (key: keyof ReportFilter, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleExport = async (format: 'csv' | 'excel') => {
    setIsGenerating(true);

    try {
      if (format === 'csv') {
        // Export as CSV
        await generateReport(filters, 'csv');
      } else {
        // For Excel, we'll use the JSON data and convert it
        const result = await generateReport(filters, 'json');
        if (result.success) {
          // In a real implementation, you'd convert to Excel here
          console.log('Excel export would be implemented here');
        }
      }
    } catch (error) {
      console.error('Export failed:', error);
    }

    setIsGenerating(false);
  };

  const renderReportPreview = () => {
    if (!reportData || !reportData.data || reportData.data.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-center">
          <div>
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No data available for the selected filters</p>
          </div>
        </div>
      );
    }

    switch (filters.reportType) {
      case 'borrowing':
        return (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">ID</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Borrower</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Item</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Quantity</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Due Date</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {reportData.data.map((item: any, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="py-3 px-4 text-sm font-mono">{item.id}</td>
                    <td className="py-3 px-4 text-sm">{item.borrower}</td>
                    <td className="py-3 px-4 text-sm">{item.item}</td>
                    <td className="py-3 px-4 text-sm">{item.quantity}</td>
                    <td className="py-3 px-4 text-sm">{item.dueDate}</td>
                    <td className="py-3 px-4">
                      <Badge className={cn(
                        "text-xs",
                        item.status === 'Active' ? "bg-green-100 text-green-800" :
                        item.status === 'Overdue' ? "bg-red-100 text-red-800" :
                        "bg-gray-100 text-gray-800"
                      )}>
                        {item.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'consuming':
        return (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">ID</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Consumer</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Material</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Consumed</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Remaining</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {reportData.data.map((item: any, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="py-3 px-4 text-sm font-mono">{item.id}</td>
                    <td className="py-3 px-4 text-sm">{item.consumer}</td>
                    <td className="py-3 px-4 text-sm">{item.material}</td>
                    <td className="py-3 px-4 text-sm">{item.consumed}</td>
                    <td className="py-3 px-4 text-sm">{item.remaining}</td>
                    <td className="py-3 px-4 text-sm">{item.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'inventory':
        return (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">ID</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Category</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Available/Total</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Condition</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {reportData.data.map((item: any, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="py-3 px-4 text-sm font-mono">{item.id}</td>
                    <td className="py-3 px-4 text-sm">{item.name}</td>
                    <td className="py-3 px-4 text-sm">{item.category}</td>
                    <td className="py-3 px-4 text-sm">
                      {item.available ? `${item.available}/${item.total}` : item.quantity}
                    </td>
                    <td className="py-3 px-4 text-sm">{item.condition || 'N/A'}</td>
                    <td className="py-3 px-4">
                      <Badge className={cn(
                        "text-xs",
                        item.status === 'Tersedia' ? "bg-green-100 text-green-800" :
                        item.status === 'Stok Menipis' ? "bg-yellow-100 text-yellow-800" :
                        "bg-gray-100 text-gray-800"
                      )}>
                        {item.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      default:
        return <div>Report preview not available</div>;
    }
  };

  const renderSummaryCards = () => {
    const currentReport = reportTypes.find(r => r.value === filters.reportType);

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="glass rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Total Records</span>
          </div>
          <p className="text-2xl font-bold">{reportData?.data?.length || 0}</p>
        </div>

        <div className="glass rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Date Range</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {filters.dateRange.from && filters.dateRange.to
              ? `${filters.dateRange.from} to ${filters.dateRange.to}`
              : 'All Dates'
            }
          </p>
        </div>

        <div className="glass rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Package className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Item Type</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {itemTypes.find(t => t.value === filters.itemType)?.label}
          </p>
        </div>

        <div className="glass rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Report Type</span>
          </div>
          <p className="text-sm text-muted-foreground">{currentReport?.label}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground mt-1">
            Generate and export comprehensive reports with dynamic previews
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => handleExport('excel')}
            disabled={isGenerating}
            className="hover-lift"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
          <Button
            onClick={() => handleExport('csv')}
            disabled={isGenerating}
            className="hover-lift"
            variant="outline"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filter Configuration */}
      <div className="glass rounded-xl p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Filter Configuration</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {/* Report Type */}
          <div className="space-y-2">
            <Label>Report Type</Label>
            <Select
              value={filters.reportType}
              onValueChange={(value) => handleFilterChange('reportType', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {reportTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div>
                      <div className="font-medium">{type.label}</div>
                      <div className="text-xs text-muted-foreground">{type.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <DateRangePicker
            value={filters.dateRange}
            onChange={(range) => handleFilterChange('dateRange', range)}
          />

          {/* Item Type */}
          <div className="space-y-2">
            <Label>Item Type</Label>
            <Select
              value={filters.itemType}
              onValueChange={(value) => handleFilterChange('itemType', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {itemTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={filters.category}
              onValueChange={(value) => handleFilterChange('category', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={filters.status}
              onValueChange={(value) => handleFilterChange('status', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {renderSummaryCards()}

      {/* Report Preview */}
      <div className="glass rounded-xl">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Report Preview</h2>
            </div>
            {isGenerating && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span>Generating report...</span>
              </div>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {reportTypes.find(r => r.value === filters.reportType)?.description}
          </p>
        </div>

        <div className="p-6">
          {renderReportPreview()}
        </div>
      </div>

      {/* Chart Placeholder */}
      <div className="glass rounded-xl p-6">
        <div className="flex items-center space-x-2 mb-4">
          <PieChart className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Analytics Overview</h2>
        </div>
        <div className="h-64 flex items-center justify-center bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
          <div className="text-center">
            <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Chart visualization will be implemented here</p>
            <p className="text-sm text-muted-foreground mt-1">
              Based on selected report type and filters
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
