'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ReportTypeConfig, getReportsByCategory } from '@/lib/report-config';
import { cn } from '@/lib/utils';

interface ReportTypeSelectorProps {
  selectedType?: string;
  onTypeSelect: (reportType: string) => void;
  reportConfigs: ReportTypeConfig[];
}

export function ReportTypeSelector({ 
  selectedType, 
  onTypeSelect, 
  reportConfigs 
}: ReportTypeSelectorProps) {
  
  const categories = [
    {
      key: 'transaction',
      label: 'Transaction Reports',
      description: 'Track borrowing and consumption activities',
      color: 'blue'
    },
    {
      key: 'inventory',
      label: 'Inventory Reports',
      description: 'Monitor tools and materials stock levels',
      color: 'green'
    },
    {
      key: 'analytics',
      label: 'Analytics Reports',
      description: 'Historical data and insights',
      color: 'purple'
    }
  ];

  const getColorClasses = (color: string, isSelected: boolean = false) => {
    const colors = {
      blue: {
        card: isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300',
        icon: 'text-blue-600',
        badge: 'bg-blue-100 text-blue-800'
      },
      green: {
        card: isSelected ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300',
        icon: 'text-green-600',
        badge: 'bg-green-100 text-green-800'
      },
      purple: {
        card: isSelected ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300',
        icon: 'text-purple-600',
        badge: 'bg-purple-100 text-purple-800'
      },
      orange: {
        card: isSelected ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-orange-300',
        icon: 'text-orange-600',
        badge: 'bg-orange-100 text-orange-800'
      },
      indigo: {
        card: isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300',
        icon: 'text-indigo-600',
        badge: 'bg-indigo-100 text-indigo-800'
      }
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Report Type</h2>
        <p className="text-gray-600">Choose the type of report you want to generate</p>
      </div>

      {categories.map((category) => {
        const categoryReports = getReportsByCategory(category.key);
        if (categoryReports.length === 0) return null;

        return (
          <div key={category.key} className="space-y-4">
            {/* Category Header */}
            <div className="flex items-center space-x-3">
              <div className={cn(
                "w-3 h-3 rounded-full",
                category.color === 'blue' && "bg-blue-500",
                category.color === 'green' && "bg-green-500",
                category.color === 'purple' && "bg-purple-500"
              )} />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{category.label}</h3>
                <p className="text-sm text-gray-600">{category.description}</p>
              </div>
            </div>

            {/* Report Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryReports.map((report) => {
                const isSelected = selectedType === report.value;
                const colorClasses = getColorClasses(report.color, isSelected);
                const IconComponent = report.icon;

                return (
                  <Card
                    key={report.value}
                    className={cn(
                      "cursor-pointer transition-all duration-200 hover:shadow-md",
                      colorClasses.card
                    )}
                    onClick={() => onTypeSelect(report.value)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <div className={cn(
                          "p-3 rounded-lg bg-white shadow-sm",
                          isSelected && "ring-2 ring-offset-2",
                          report.color === 'blue' && isSelected && "ring-blue-500",
                          report.color === 'green' && isSelected && "ring-green-500",
                          report.color === 'purple' && isSelected && "ring-purple-500",
                          report.color === 'orange' && isSelected && "ring-orange-500",
                          report.color === 'indigo' && isSelected && "ring-indigo-500"
                        )}>
                          <IconComponent className={cn("w-6 h-6", colorClasses.icon)} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-lg font-semibold text-gray-900">
                              {report.label}
                            </h4>
                            {isSelected && (
                              <Badge className={colorClasses.badge}>
                                Selected
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-3">
                            {report.description}
                          </p>
                          
                          {/* Feature Badges */}
                          <div className="flex flex-wrap gap-2">
                            {report.supportsPagination && (
                              <Badge variant="outline" className="text-xs">
                                Paginated
                              </Badge>
                            )}
                            {report.supportsExport && (
                              <Badge variant="outline" className="text-xs">
                                Exportable
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {report.filters.length} filters
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Quick Stats */}
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {getReportsByCategory('transaction').length}
            </div>
            <div className="text-sm text-gray-600">Transaction Reports</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {getReportsByCategory('inventory').length}
            </div>
            <div className="text-sm text-gray-600">Inventory Reports</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">
              {getReportsByCategory('analytics').length}
            </div>
            <div className="text-sm text-gray-600">Analytics Reports</div>
          </div>
        </div>
      </div>
    </div>
  );
}
