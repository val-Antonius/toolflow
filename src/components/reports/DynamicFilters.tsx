'use client';

import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { FilterConfig, ReportTypeConfig } from '@/lib/report-config';
import { X, Filter, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DateRangeFilter {
  from: string;
  to: string;
}

type FilterValue = string | number | string[] | DateRangeFilter | null;

interface Filters {
  [key: string]: FilterValue;
}

interface DynamicFiltersProps {
  reportConfig: ReportTypeConfig;
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  onApplyFilters: () => void;
  isLoading?: boolean;
}

interface MultiSelectState {
  [key: string]: string[];
}

export function DynamicFilters({ 
  reportConfig, 
  filters, 
  onFiltersChange, 
  onApplyFilters,
  isLoading = false 
}: DynamicFiltersProps) {
  const [multiSelectState, setMultiSelectState] = useState<MultiSelectState>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize multiselect state
  useEffect(() => {
    const initialMultiSelect: MultiSelectState = {};
    reportConfig.filters.forEach(filter => {
      if (filter.type === 'multiselect') {
        initialMultiSelect[filter.key] = (filters[filter.key] as string[]) || [];
      }
    });
    setMultiSelectState(initialMultiSelect);
  }, [reportConfig, filters]);

  // Track changes
  useEffect(() => {
    setHasChanges(true);
  }, [filters]);

  const handleFilterChange = (key: string, value: FilterValue) => {
    const newFilters = { ...filters, [key]: value };
    onFiltersChange(newFilters);
  };

  const handleMultiSelectToggle = (filterKey: string, value: string) => {
    const currentValues = multiSelectState[filterKey] || [];
    let newValues: string[];
    
    if (currentValues.includes(value)) {
      newValues = currentValues.filter(v => v !== value);
    } else {
      newValues = [...currentValues, value];
    }
    
    setMultiSelectState(prev => ({ ...prev, [filterKey]: newValues }));
    handleFilterChange(filterKey, newValues);
  };

  const resetFilters = () => {
    const defaultFilters: Filters = {};
    reportConfig.filters.forEach(filter => {
      if (filter.type === 'multiselect') {
        defaultFilters[filter.key] = [];
      } else if (filter.type === 'daterange') {
        defaultFilters[filter.key] = { from: '', to: '' };
      } else {
        defaultFilters[filter.key] = filter.type === 'select' ? 'all' : '';
      }
    });

    setMultiSelectState({});
    onFiltersChange(defaultFilters);
    setHasChanges(false);
  };

  const renderFilter = (filter: FilterConfig) => {
    // Check conditional rendering
    if (filter.conditional && !filter.conditional(filters)) {
      return null;
    }

    const commonProps = {
      className: "space-y-2"
    };

    switch (filter.type) {
      case 'select':
        return (
          <div key={filter.key} {...commonProps}>
            <Label className="text-sm font-medium">{filter.label}</Label>
            <Select
              value={(filters[filter.key] as string) || 'all'}
              onValueChange={(value) => handleFilterChange(filter.key, value)}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {filter.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'multiselect':
        const selectedValues = multiSelectState[filter.key] || [];
        return (
          <div key={filter.key} {...commonProps}>
            <Label className="text-sm font-medium">{filter.label}</Label>
            <div className="space-y-2">
              <Select
                onValueChange={(value) => handleMultiSelectToggle(filter.key, value)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={`Select ${filter.label.toLowerCase()}...`} />
                </SelectTrigger>
                <SelectContent>
                  {filter.options?.filter(option => option.value !== 'all').map((option) => (
                    <SelectItem 
                      key={option.value} 
                      value={option.value}
                      disabled={selectedValues.includes(option.value)}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedValues.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedValues.map((value) => {
                    const option = filter.options?.find(opt => opt.value === value);
                    return (
                      <Badge 
                        key={value} 
                        variant="secondary" 
                        className="text-xs px-2 py-1 cursor-pointer hover:bg-red-100"
                        onClick={() => handleMultiSelectToggle(filter.key, value)}
                      >
                        {option?.label}
                        <X className="w-3 h-3 ml-1" />
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );

      case 'daterange':
        return (
          <div key={filter.key} {...commonProps}>
            <Label className="text-sm font-medium">{filter.label}</Label>
            <DateRangePicker
              value={(filters[filter.key] as DateRangeFilter) || { from: '', to: '' }}
              onChange={(range) => handleFilterChange(filter.key, range)}
            />
          </div>
        );

      case 'text':
        return (
          <div key={filter.key} {...commonProps}>
            <Label className="text-sm font-medium">{filter.label}</Label>
            <Input
              type="text"
              placeholder={filter.placeholder || `Enter ${filter.label.toLowerCase()}...`}
              value={(filters[filter.key] as string) || ''}
              onChange={(e) => handleFilterChange(filter.key, e.target.value)}
              className="h-9"
            />
          </div>
        );

      case 'number':
        return (
          <div key={filter.key} {...commonProps}>
            <Label className="text-sm font-medium">{filter.label}</Label>
            <Input
              type="number"
              placeholder={filter.placeholder || `Enter ${filter.label.toLowerCase()}...`}
              value={(filters[filter.key] as string | number) || ''}
              onChange={(e) => handleFilterChange(filter.key, e.target.value)}
              className="h-9"
            />
          </div>
        );

      default:
        return null;
    }
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    reportConfig.filters.forEach(filter => {
      const value = filters[filter.key];
      if (filter.type === 'multiselect') {
        if (value && Array.isArray(value) && value.length > 0) count++;
      } else if (filter.type === 'daterange') {
        const dateRange = value as DateRangeFilter;
        if (dateRange && (dateRange.from || dateRange.to)) count++;
      } else if (value && value !== 'all' && value !== '') {
        count++;
      }
    });
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <div className="space-y-4">
      {/* Filter Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Filters</h3>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {activeFiltersCount} active
            </Badge>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            disabled={activeFiltersCount === 0}
            className="h-8 px-2 text-xs"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Reset
          </Button>
        </div>
      </div>

      {/* Dynamic Filters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {reportConfig.filters.map(renderFilter)}
      </div>

      {/* Apply Button */}
      <div className="flex justify-end pt-2 border-t">
        <Button
          onClick={onApplyFilters}
          disabled={isLoading || !hasChanges}
          className={cn(
            "px-6",
            hasChanges && "bg-primary hover:bg-primary/90"
          )}
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Generating...
            </>
          ) : (
            <>
              <Filter className="w-4 h-4 mr-2" />
              Apply Filters
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
