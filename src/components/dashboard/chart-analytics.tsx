'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
// Simple chart implementation without external dependencies
import {
  Wrench,
  Package,
  ArrowRightLeft,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Filter
} from 'lucide-react';

interface ChartDataPoint {
  month: string;
  created?: number;
  total?: number;
  consumed?: number;
  borrowed?: number;
  returned?: number;
  overdue?: number;
  good?: number;
  fair?: number;
  poor?: number;
}

interface ChartData {
  filter: string;
  months: number;
  data: ChartDataPoint[];
}

interface ChartAnalyticsProps {
  className?: string;
}

const filterOptions = [
  { value: 'tools', label: 'Perbandingan Tools', icon: Wrench, description: 'Tools yang dibuat vs total tools' },
  { value: 'materials', label: 'Perbandingan Material', icon: Package, description: 'Material baru vs konsumsi' },
  { value: 'borrowing', label: 'Aktivitas Borrowing', icon: ArrowRightLeft, description: 'Peminjaman vs pengembalian' },
  { value: 'conditions', label: 'Kondisi Tool Returns', icon: AlertTriangle, description: 'Kondisi poor vs fair vs good' }
];

const monthOptions = [
  { value: 3, label: '3 Bulan' },
  { value: 6, label: '6 Bulan' },
  { value: 9, label: '9 Bulan' },
  { value: 12, label: '12 Bulan' }
];

export function ChartAnalytics({ className }: ChartAnalyticsProps) {
  const [selectedFilter, setSelectedFilter] = useState('tools');
  const [selectedMonths, setSelectedMonths] = useState(6);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchChartData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/dashboard/charts?filter=${selectedFilter}&months=${selectedMonths}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setChartData(result.data);
        }
      }
    } catch (error) {
      console.error('Error fetching chart data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedFilter, selectedMonths]);

  useEffect(() => {
    fetchChartData();
  }, [selectedFilter, selectedMonths, fetchChartData]);

  const currentFilter = filterOptions.find(f => f.value === selectedFilter);
  const IconComponent = currentFilter?.icon || TrendingUp;

  const renderChart = () => {
    if (!chartData || !chartData.data.length) {
      return (
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Tidak ada data untuk ditampilkan</p>
          </div>
        </div>
      );
    }

    const data = chartData.data;
    const maxValue = Math.max(...data.flatMap(item => Object.values(item).filter(v => typeof v === 'number')));

    return (
      <div className="space-y-4">
        {/* Legend */}
        <div className="flex flex-wrap gap-4 justify-center">
          {selectedFilter === 'tools' && (
            <>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <span className="text-sm">Tools Dibuat</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className="text-sm">Total Tools</span>
              </div>
            </>
          )}
          {selectedFilter === 'materials' && (
            <>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <span className="text-sm">Material Baru</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span className="text-sm">Konsumsi</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className="text-sm">Total Material</span>
              </div>
            </>
          )}
          {selectedFilter === 'borrowing' && (
            <>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <span className="text-sm">Dipinjam</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className="text-sm">Dikembalikan</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span className="text-sm">Terlambat</span>
              </div>
            </>
          )}
          {selectedFilter === 'conditions' && (
            <>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className="text-sm">Good/Excellent</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                <span className="text-sm">Fair</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span className="text-sm">Poor</span>
              </div>
            </>
          )}
        </div>

        {/* Simple Bar Chart */}
        <div className="h-64 flex items-end justify-between space-x-2 p-4 bg-gray-50 rounded-lg">
          {data.map((item, index) => (
            <div key={index} className="flex-1 flex flex-col items-center space-y-2">
              <div className="flex-1 flex items-end justify-center space-x-1 w-full">
                {selectedFilter === 'tools' && (
                  <>
                    <div
                      className="bg-blue-500 rounded-t min-w-[8px]"
                      style={{ height: `${((item.created || 0) / maxValue) * 200}px` }}
                      title={`Tools Dibuat: ${item.created || 0}`}
                    ></div>
                    <div
                      className="bg-green-500 rounded-t min-w-[8px]"
                      style={{ height: `${((item.total || 0) / maxValue) * 200}px` }}
                      title={`Total Tools: ${item.total || 0}`}
                    ></div>
                  </>
                )}
                {selectedFilter === 'materials' && (
                  <>
                    <div
                      className="bg-blue-500 rounded-t min-w-[6px]"
                      style={{ height: `${((item.created || 0) / maxValue) * 200}px` }}
                      title={`Material Baru: ${item.created || 0}`}
                    ></div>
                    <div
                      className="bg-red-500 rounded-t min-w-[6px]"
                      style={{ height: `${((item.consumed || 0) / maxValue) * 200}px` }}
                      title={`Konsumsi: ${item.consumed || 0}`}
                    ></div>
                    <div
                      className="bg-green-500 rounded-t min-w-[6px]"
                      style={{ height: `${((item.total || 0) / maxValue) * 200}px` }}
                      title={`Total Material: ${item.total || 0}`}
                    ></div>
                  </>
                )}
                {selectedFilter === 'borrowing' && (
                  <>
                    <div
                      className="bg-blue-500 rounded-t min-w-[6px]"
                      style={{ height: `${((item.borrowed || 0) / maxValue) * 200}px` }}
                      title={`Dipinjam: ${item.borrowed || 0}`}
                    ></div>
                    <div
                      className="bg-green-500 rounded-t min-w-[6px]"
                      style={{ height: `${((item.returned || 0) / maxValue) * 200}px` }}
                      title={`Dikembalikan: ${item.returned || 0}`}
                    ></div>
                    <div
                      className="bg-red-500 rounded-t min-w-[6px]"
                      style={{ height: `${((item.overdue || 0) / maxValue) * 200}px` }}
                      title={`Terlambat: ${item.overdue || 0}`}
                    ></div>
                  </>
                )}
                {selectedFilter === 'conditions' && (
                  <>
                    <div
                      className="bg-green-500 rounded-t min-w-[6px]"
                      style={{ height: `${((item.good || 0) / maxValue) * 200}px` }}
                      title={`Good: ${item.good || 0}`}
                    ></div>
                    <div
                      className="bg-yellow-500 rounded-t min-w-[6px]"
                      style={{ height: `${((item.fair || 0) / maxValue) * 200}px` }}
                      title={`Fair: ${item.fair || 0}`}
                    ></div>
                    <div
                      className="bg-red-500 rounded-t min-w-[6px]"
                      style={{ height: `${((item.poor || 0) / maxValue) * 200}px` }}
                      title={`Poor: ${item.poor || 0}`}
                    ></div>
                  </>
                )}
              </div>
              <span className="text-xs text-muted-foreground text-center">{item.month}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card className={cn("glass", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <IconComponent className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Chart Analytics</CardTitle>
              <CardDescription>{currentFilter?.description}</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="flex items-center space-x-1">
            <Calendar className="w-3 h-3" />
            <span>{selectedMonths} Bulan</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              <Filter className="w-4 h-4 inline mr-1" />
              Filter Data
            </label>
            <Select value={selectedFilter} onValueChange={setSelectedFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {filterOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center space-x-2">
                      <option.icon className="w-4 h-4" />
                      <span>{option.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              <Calendar className="w-4 h-4 inline mr-1" />
              Periode
            </label>
            <Select value={selectedMonths.toString()} onValueChange={(value) => setSelectedMonths(parseInt(value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Chart */}
        <div className="relative">
          {loading && (
            <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}
          {renderChart()}
        </div>
      </CardContent>
    </Card>
  );
}
