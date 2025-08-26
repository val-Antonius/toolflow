import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { iconRegistry, IconName } from '@/lib/icon-registry';

// Report Configuration System - Revolutionary Dynamic Context-Aware Filtering
export interface ReportColumn {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'status' | 'currency' | 'list' | 'badge';
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
  render?: (value: any, row: any) => React.ReactNode;
}

export interface FilterConfig {
  key: string;
  label: string;
  type: 'select' | 'multiselect' | 'daterange' | 'text' | 'number';
  options?: Array<{ value: string; label: string }>;
  required?: boolean;
  dependsOn?: string;
  conditional?: (filters: any) => boolean;
  placeholder?: string;
}

export interface ReportTypeConfig {
  value: string;
  label: string;
  description: string;
  category: 'transaction' | 'inventory' | 'analytics';
  icon: IconName;
  filters: FilterConfig[];
  columns: ReportColumn[];
  defaultSort: { key: string; order: 'asc' | 'desc' };
  supportsPagination: boolean;
  supportsExport: boolean;
  apiEndpoint: string;
  color: string;
}

// Status Badge Renderer
const StatusBadge = ({ status, type }: { status: string; type: string }) => {
  const getStatusColor = (status: string, type: string) => {
    if (type === 'borrowing') {
      switch (status) {
        case 'ACTIVE': return 'bg-blue-100 text-blue-800';
        case 'OVERDUE': return 'bg-red-100 text-red-800';
        case 'COMPLETED': return 'bg-green-100 text-green-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    }
    if (type === 'tools') {
      switch (status) {
        case 'Available': return 'bg-green-100 text-green-800';
        case 'In Use': return 'bg-blue-100 text-blue-800';
        case 'Maintenance': return 'bg-yellow-100 text-yellow-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    }
    if (type === 'materials') {
      switch (status) {
        case 'In Stock': return 'bg-green-100 text-green-800';
        case 'Low Stock': return 'bg-yellow-100 text-yellow-800';
        case 'Out of Stock': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    }
    if (type === 'condition') {
      switch (status) {
        case 'EXCELLENT': return 'bg-green-100 text-green-800';
        case 'GOOD': return 'bg-blue-100 text-blue-800';
        case 'FAIR': return 'bg-yellow-100 text-yellow-800';
        case 'POOR': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    }
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <Badge className={cn("text-xs", getStatusColor(status, type))}>
      {status}
    </Badge>
  );
};

// Items List Renderer
const ItemsList = ({ items, maxShow = 2 }: { items: any[]; maxShow?: number }) => {
  if (!items || items.length === 0) return <span className="text-gray-500">-</span>;
  
  return (
    <div className="space-y-1">
      {items.slice(0, maxShow).map((item: any, idx: number) => (
        <div key={idx} className="text-xs text-gray-600">
          {item.name || item.toolName || item.materialName} 
          {item.quantity && ` (${item.quantity}x)`}
        </div>
      ))}
      {items.length > maxShow && (
        <div className="text-xs text-gray-500">
          +{items.length - maxShow} more items
        </div>
      )}
    </div>
  );
};

// Currency Formatter
const CurrencyFormatter = ({ value }: { value: number }) => {
  if (!value) return <span className="text-gray-500">-</span>;
  return (
    <span className="font-mono text-sm">
      Rp {value.toLocaleString('id-ID')}
    </span>
  );
};

// Date Formatter
const DateFormatter = ({ date }: { date: string }) => {
  if (!date) return <span className="text-gray-500">-</span>;
  return (
    <span className="text-sm">
      {new Date(date).toLocaleDateString('id-ID')}
    </span>
  );
};

// Dynamic Report Configurations
export const reportConfigurations: ReportTypeConfig[] = [
  {
    value: 'borrowing',
    label: 'Active Borrowing',
    description: 'Tools currently borrowed with status tracking and due dates',
    category: 'transaction',
    icon: 'Package',
    apiEndpoint: 'borrowing',
    supportsPagination: true,
    supportsExport: true,
    defaultSort: { key: 'borrowDate', order: 'desc' },
    color: 'blue',
    filters: [
      {
        key: 'dateRange',
        label: 'Borrow Date Range',
        type: 'daterange',
        required: false
      },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { value: 'all', label: 'All Status' },
          { value: 'ACTIVE', label: 'Active' },
          { value: 'OVERDUE', label: 'Overdue' },
          { value: 'COMPLETED', label: 'Completed' }
        ]
      },
      {
        key: 'category',
        label: 'Tool Category',
        type: 'multiselect',
        options: [] // Will be populated dynamically
      },
      {
        key: 'borrower',
        label: 'Borrower Name',
        type: 'text',
        placeholder: 'Search by borrower name...'
      }
    ],
    columns: [
      { 
        key: 'id', 
        label: 'ID', 
        type: 'text', 
        sortable: true, 
        width: '100px',
        render: (value) => <span className="font-mono text-xs">{value.slice(0, 8)}...</span>
      },
      { key: 'borrower', label: 'Borrower', type: 'text', sortable: true, width: '150px' },
      { 
        key: 'items', 
        label: 'Items', 
        type: 'list', 
        width: '200px',
        render: (value) => <ItemsList items={value} />
      },
      { 
        key: 'borrowDate', 
        label: 'Borrow Date', 
        type: 'date', 
        sortable: true, 
        width: '120px',
        render: (value) => <DateFormatter date={value} />
      },
      { 
        key: 'dueDate', 
        label: 'Due Date', 
        type: 'date', 
        sortable: true, 
        width: '120px',
        render: (value) => <DateFormatter date={value} />
      },
      { 
        key: 'status', 
        label: 'Status', 
        type: 'status', 
        sortable: true, 
        width: '100px',
        render: (value) => <StatusBadge status={value} type="borrowing" />
      },
      { key: 'purpose', label: 'Purpose', type: 'text', width: '200px' }
    ]
  },
  {
    value: 'consuming',
    label: 'Material Consumption',
    description: 'Material usage tracking with project details and cost analysis',
    category: 'transaction',
    icon: 'TrendingUp',
    apiEndpoint: 'consuming',
    supportsPagination: true,
    supportsExport: true,
    defaultSort: { key: 'consumptionDate', order: 'desc' },
    color: 'green',
    filters: [
      {
        key: 'dateRange',
        label: 'Consumption Date Range',
        type: 'daterange',
        required: false
      },
      {
        key: 'category',
        label: 'Material Category',
        type: 'multiselect',
        options: [] // Will be populated dynamically
      },
      {
        key: 'consumer',
        label: 'Consumer Name',
        type: 'text',
        placeholder: 'Search by consumer name...'
      },
      {
        key: 'project',
        label: 'Project Name',
        type: 'text',
        placeholder: 'Search by project name...'
      },
      {
        key: 'minValue',
        label: 'Minimum Value (Rp)',
        type: 'number',
        placeholder: 'Enter minimum value...'
      }
    ],
    columns: [
      { 
        key: 'id', 
        label: 'ID', 
        type: 'text', 
        sortable: true, 
        width: '100px',
        render: (value) => <span className="font-mono text-xs">{value.slice(0, 8)}...</span>
      },
      { key: 'consumer', label: 'Consumer', type: 'text', sortable: true, width: '150px' },
      { 
        key: 'consumptionDate', 
        label: 'Date', 
        type: 'date', 
        sortable: true, 
        width: '120px',
        render: (value) => <DateFormatter date={value} />
      },
      { key: 'projectName', label: 'Project', type: 'text', sortable: true, width: '150px' },
      { 
        key: 'items', 
        label: 'Materials', 
        type: 'list', 
        width: '200px',
        render: (value) => <ItemsList items={value} />
      },
      { 
        key: 'totalValue', 
        label: 'Total Value', 
        type: 'currency', 
        sortable: true, 
        width: '120px',
        render: (value) => <CurrencyFormatter value={value} />
      },
      { key: 'purpose', label: 'Purpose', type: 'text', width: '200px' }
    ]
  },
  {
    value: 'tools',
    label: 'Tools Inventory',
    description: 'Complete tools inventory with availability status and condition tracking',
    category: 'inventory',
    icon: 'Package',
    apiEndpoint: 'tools',
    supportsPagination: true,
    supportsExport: true,
    defaultSort: { key: 'name', order: 'asc' },
    color: 'purple',
    filters: [
      {
        key: 'category',
        label: 'Category',
        type: 'multiselect',
        options: [] // Will be populated dynamically
      },
      {
        key: 'status',
        label: 'Availability Status',
        type: 'select',
        options: [
          { value: 'all', label: 'All Status' },
          { value: 'available', label: 'Available' },
          { value: 'in-use', label: 'In Use' },
          { value: 'maintenance', label: 'Under Maintenance' }
        ]
      },
      {
        key: 'condition',
        label: 'Condition',
        type: 'select',
        options: [
          { value: 'all', label: 'All Conditions' },
          { value: 'EXCELLENT', label: 'Excellent' },
          { value: 'GOOD', label: 'Good' },
          { value: 'FAIR', label: 'Fair' },
          { value: 'POOR', label: 'Poor' }
        ]
      },
      {
        key: 'location',
        label: 'Location',
        type: 'text',
        placeholder: 'Search by location...'
      },
      {
        key: 'name',
        label: 'Tool Name',
        type: 'text',
        placeholder: 'Search by tool name...'
      }
    ],
    columns: [
      {
        key: 'id',
        label: 'ID',
        type: 'text',
        sortable: true,
        width: '100px',
        render: (value) => <span className="font-mono text-xs">{value.slice(0, 8)}...</span>
      },
      { key: 'name', label: 'Name', type: 'text', sortable: true, width: '200px' },
      { key: 'category', label: 'Category', type: 'text', sortable: true, width: '120px' },
      {
        key: 'condition',
        label: 'Condition',
        type: 'status',
        sortable: true,
        width: '100px',
        render: (value) => <StatusBadge status={value} type="condition" />
      },
      {
        key: 'availability',
        label: 'Available/Total',
        type: 'text',
        sortable: true,
        width: '120px',
        render: (value, row) => (
          <span className="font-mono text-sm">
            {row.available}/{row.total}
          </span>
        )
      },
      { key: 'location', label: 'Location', type: 'text', sortable: true, width: '120px' },
      {
        key: 'status',
        label: 'Status',
        type: 'status',
        sortable: true,
        width: '100px',
        render: (value) => <StatusBadge status={value} type="tools" />
      }
    ]
  },
  {
    value: 'materials',
    label: 'Materials Inventory',
    description: 'Complete materials inventory with stock levels and threshold monitoring',
    category: 'inventory',
    icon: 'Archive',
    apiEndpoint: 'material',
    supportsPagination: true,
    supportsExport: true,
    defaultSort: { key: 'name', order: 'asc' },
    color: 'orange',
    filters: [
      {
        key: 'category',
        label: 'Category',
        type: 'multiselect',
        options: [] // Will be populated dynamically
      },
      {
        key: 'stockStatus',
        label: 'Stock Status',
        type: 'select',
        options: [
          { value: 'all', label: 'All Status' },
          { value: 'in-stock', label: 'In Stock' },
          { value: 'low-stock', label: 'Low Stock' },
          { value: 'out-of-stock', label: 'Out of Stock' }
        ]
      },
      {
        key: 'location',
        label: 'Location',
        type: 'text',
        placeholder: 'Search by location...'
      },
      {
        key: 'name',
        label: 'Material Name',
        type: 'text',
        placeholder: 'Search by material name...'
      }
    ],
    columns: [
      {
        key: 'id',
        label: 'ID',
        type: 'text',
        sortable: true,
        width: '100px',
        render: (value) => <span className="font-mono text-xs">{value.slice(0, 8)}...</span>
      },
      { key: 'name', label: 'Name', type: 'text', sortable: true, width: '200px' },
      { key: 'category', label: 'Category', type: 'text', sortable: true, width: '120px' },
      {
        key: 'currentQuantity',
        label: 'Current Stock',
        type: 'number',
        sortable: true,
        width: '120px',
        render: (value, row) => (
          <span className="font-mono text-sm">
            {value} {row.unit}
          </span>
        )
      },
      { key: 'unit', label: 'Unit', type: 'text', width: '80px' },
      {
        key: 'thresholdQuantity',
        label: 'Threshold',
        type: 'number',
        sortable: true,
        width: '100px',
        render: (value, row) => (
          <span className="font-mono text-sm text-gray-600">
            {value} {row.unit}
          </span>
        )
      },
      { key: 'location', label: 'Location', type: 'text', sortable: true, width: '120px' },
      {
        key: 'status',
        label: 'Status',
        type: 'status',
        sortable: true,
        width: '100px',
        render: (value) => <StatusBadge status={value} type="materials" />
      }
    ]
  },
  {
    value: 'transaction-history',
    label: 'Transaction History',
    description: 'Combined completed borrowing and consumption transactions with analytics',
    category: 'analytics',
    icon: 'BarChart3',
    apiEndpoint: 'history',
    supportsPagination: true,
    supportsExport: true,
    defaultSort: { key: 'date', order: 'desc' },
    color: 'indigo',
    filters: [
      {
        key: 'dateRange',
        label: 'Transaction Date Range',
        type: 'daterange',
        required: true
      },
      {
        key: 'transactionType',
        label: 'Transaction Type',
        type: 'select',
        options: [
          { value: 'all', label: 'All Transactions' },
          { value: 'borrowing', label: 'Borrowing Only' },
          { value: 'consumption', label: 'Consumption Only' }
        ]
      },
      {
        key: 'category',
        label: 'Category',
        type: 'multiselect',
        options: [] // Will be populated dynamically
      },
      {
        key: 'person',
        label: 'Person Name',
        type: 'text',
        placeholder: 'Search by person name...'
      }
    ],
    columns: [
      {
        key: 'id',
        label: 'ID',
        type: 'text',
        sortable: true,
        width: '100px',
        render: (value) => <span className="font-mono text-xs">{value.slice(0, 8)}...</span>
      },
      {
        key: 'type',
        label: 'Type',
        type: 'status',
        sortable: true,
        width: '100px',
        render: (value) => (
          <Badge className={cn(
            "text-xs",
            value === 'borrowing' ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"
          )}>
            {value === 'borrowing' ? 'Borrow' : 'Consume'}
          </Badge>
        )
      },
      {
        key: 'date',
        label: 'Date',
        type: 'date',
        sortable: true,
        width: '120px',
        render: (value) => <DateFormatter date={value} />
      },
      { key: 'person', label: 'Person', type: 'text', sortable: true, width: '150px' },
      {
        key: 'items',
        label: 'Items',
        type: 'list',
        width: '200px',
        render: (value) => <ItemsList items={value} />
      },
      { key: 'purpose', label: 'Purpose', type: 'text', width: '200px' },
      {
        key: 'value',
        label: 'Value',
        type: 'currency',
        sortable: true,
        width: '120px',
        render: (value) => value ? <CurrencyFormatter value={value} /> : <span className="text-gray-500">-</span>
      }
    ]
  }
];

// Helper functions
export const getReportConfig = (reportType: string): ReportTypeConfig | undefined => {
  return reportConfigurations.find(config => config.value === reportType);
};

export const getReportsByCategory = (category: string): ReportTypeConfig[] => {
  return reportConfigurations.filter(config => config.category === category);
};

export const getAllReportTypes = (): ReportTypeConfig[] => {
  return reportConfigurations;
};

// Filter validation and processing
export const validateFilters = (reportType: string, filters: any): { isValid: boolean; errors: string[] } => {
  const config = getReportConfig(reportType);
  if (!config) return { isValid: false, errors: ['Invalid report type'] };

  const errors: string[] = [];

  config.filters.forEach(filterConfig => {
    if (filterConfig.required && (!filters[filterConfig.key] || filters[filterConfig.key] === '')) {
      errors.push(`${filterConfig.label} is required`);
    }
  });

  return { isValid: errors.length === 0, errors };
};

// Dynamic filter options population - ULTIMATE FIX: No cloning, direct modification
export const populateFilterOptions = async (reportType: string): Promise<ReportTypeConfig> => {
  const config = getReportConfig(reportType);
  if (!config) throw new Error('Invalid report type');

  // Create a new config with populated filter options (preserving all original properties)
  const populatedConfig: ReportTypeConfig = {
    value: config.value,
    label: config.label,
    description: config.description,
    category: config.category,
    icon: config.icon, // Icon name string - safe to copy
    apiEndpoint: config.apiEndpoint,
    supportsPagination: config.supportsPagination,
    supportsExport: config.supportsExport,
    defaultSort: { ...config.defaultSort },
    color: config.color,
    filters: [], // Will be populated below
    columns: [...config.columns] // Shallow copy is fine for columns
  };

  // Populate filters with category options
  try {
    const response = await fetch('/api/categories');
    const categories = await response.json();

    populatedConfig.filters = config.filters.map(filter => {
      if (filter.key === 'category') {
        return {
          ...filter,
          options: [
            { value: 'all', label: 'All Categories' },
            ...categories.data
              .filter((cat: any) => {
                // Filter categories based on report type
                if (reportType === 'tools' || reportType === 'borrowing') {
                  return cat.type === 'TOOL';
                }
                if (reportType === 'materials' || reportType === 'consuming') {
                  return cat.type === 'MATERIAL';
                }
                return true; // For transaction-history, show all
              })
              .map((cat: any) => ({ value: cat.id, label: cat.name }))
          ]
        };
      }
      return { ...filter }; // Shallow copy for other filters
    });
  } catch (error) {
    console.error('Failed to populate category options:', error);
    // Fallback to original filters if API fails
    populatedConfig.filters = [...config.filters];
  }

  return populatedConfig;
};
