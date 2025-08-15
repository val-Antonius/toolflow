import React, { useState } from 'react';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { cn } from '@/lib/utils';
import { Calendar, ChevronDown } from 'lucide-react';

interface DateRange {
  from: string;
  to: string;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

const presetRanges = [
  { label: 'Last 7 days', value: 7 },
  { label: 'Last 30 days', value: 30 },
  { label: 'Last 90 days', value: 90 },
  { label: 'This month', value: 'month' },
  { label: 'This year', value: 'year' },
];

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handlePresetSelect = (preset: any) => {
    const today = new Date();
    let from: Date;
    let to: Date = today;

    if (typeof preset.value === 'number') {
      from = new Date(today.getTime() - preset.value * 24 * 60 * 60 * 1000);
    } else if (preset.value === 'month') {
      from = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (preset.value === 'year') {
      from = new Date(today.getFullYear(), 0, 1);
    } else {
      return;
    }

    onChange({
      from: from.toISOString().split('T')[0],
      to: to.toISOString().split('T')[0]
    });
    setIsOpen(false);
  };

  const formatDateRange = () => {
    if (!value.from || !value.to) return 'Select date range';
    
    const fromDate = new Date(value.from);
    const toDate = new Date(value.to);
    
    return `${fromDate.toLocaleDateString()} - ${toDate.toLocaleDateString()}`;
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Label>Date Range</Label>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-between",
              !value.from && !value.to && "text-muted-foreground"
            )}
          >
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4" />
              <span>{formatDateRange()}</span>
            </div>
            <ChevronDown className="w-4 h-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4" align="start">
          <div className="space-y-4">
            {/* Preset Ranges */}
            <div>
              <Label className="text-xs text-muted-foreground">Quick Select</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {presetRanges.map((preset) => (
                  <Button
                    key={preset.label}
                    variant="outline"
                    size="sm"
                    onClick={() => handlePresetSelect(preset)}
                    className="text-xs"
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Range */}
            <div className="space-y-3">
              <Label className="text-xs text-muted-foreground">Custom Range</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="from-date" className="text-xs">From</Label>
                  <Input
                    id="from-date"
                    type="date"
                    value={value.from}
                    onChange={(e) => onChange({ ...value, from: e.target.value })}
                    className="text-xs"
                  />
                </div>
                <div>
                  <Label htmlFor="to-date" className="text-xs">To</Label>
                  <Input
                    id="to-date"
                    type="date"
                    value={value.to}
                    onChange={(e) => onChange({ ...value, to: e.target.value })}
                    className="text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                Apply
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
