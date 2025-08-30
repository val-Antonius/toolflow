import React, { useState, useRef } from 'react';
import { Input } from './input';
import { Label } from './label';
import { Button } from './button';
import { cn } from '@/lib/utils';
import { Calendar, Clock, X } from 'lucide-react';

interface DateTimePickerProps {
  id?: string;
  label?: string;
  value?: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  required?: boolean;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function DateTimePicker({
  id,
  label,
  value = '',
  onChange,
  min,
  max,
  required = false,
  className,
  placeholder = "Select date and time",
  disabled = false
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleInputClick = () => {
    if (!disabled) {
      setIsOpen(true);
      if (inputRef.current) {
        inputRef.current.focus();
        // Try the modern showPicker API first
        try {
          if (inputRef.current.showPicker) {
            inputRef.current.showPicker();
          } else {
            // Fallback to click() for broader browser support
            inputRef.current.click();
          }
        } catch (e) {
          // If showPicker fails, ensure the input is still clickable
          inputRef.current.click();
        }
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  const formatDisplayValue = (dateTimeValue: string) => {
    if (!dateTimeValue) return '';
    
    try {
      const date = new Date(dateTimeValue);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateTimeValue;
    }
  };

  const getStatusColor = () => {
    if (!value) return 'text-gray-400';
    
    const selectedDate = new Date(value);
    const now = new Date();
    
    if (selectedDate < now) {
      return 'text-red-600';
    } else if (selectedDate.getTime() - now.getTime() < 24 * 60 * 60 * 1000) {
      return 'text-amber-600';
    } else {
      return 'text-green-600';
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label htmlFor={id} className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      
      <div className="relative">
        {/* Native datetime-local input */}
        <input
          ref={inputRef}
          id={id}
          type="datetime-local"
          value={value}
          onChange={handleInputChange}
          min={min}
          max={max}
          required={required}
          disabled={disabled}
          className={cn(
            "absolute inset-0 w-full h-full cursor-pointer",
            "opacity-0 focus:opacity-0",
            disabled && "cursor-not-allowed"
          )}
          style={{ WebkitAppearance: 'none', appearance: 'none' }}
          aria-label={label || "Date and time picker"}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            setTimeout(() => setIsOpen(false), 200);
          }}
        />
        
        {/* Custom styled display */}
        <div
          onClick={handleInputClick}
          className={cn(
            "relative flex items-center w-full px-3 py-2 text-sm border rounded-md transition-all duration-200",
            "bg-white hover:bg-gray-50 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500",
            disabled && "opacity-50 cursor-not-allowed",
            isOpen && "ring-2 ring-blue-500 border-blue-500",
            disabled 
              ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200"
              : "cursor-pointer border-gray-300 hover:border-gray-400",
            value ? "text-gray-900" : "text-gray-400"
          )}
        >
          {/* Calendar Icon */}
          <Calendar className={cn(
            "w-4 h-4 mr-2 flex-shrink-0",
            disabled ? "text-gray-300" : "text-gray-500"
          )} />
          
          {/* Display Value */}
          <div className="flex-1 min-w-0">
            {value ? (
              <div className="space-y-1">
                <div className={cn("font-medium", getStatusColor())}>
                  {formatDisplayValue(value)}
                </div>
                {value && (
                  <div className="text-xs text-gray-500">
                    {(() => {
                      const selectedDate = new Date(value);
                      const now = new Date();
                      const diffMs = selectedDate.getTime() - now.getTime();
                      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                      
                      if (diffDays < 0) {
                        return `${Math.abs(diffDays)} days ago`;
                      } else if (diffDays === 0) {
                        return 'Today';
                      } else if (diffDays === 1) {
                        return 'Tomorrow';
                      } else {
                        return `In ${diffDays} days`;
                      }
                    })()}
                  </div>
                )}
              </div>
            ) : (
              <span className="text-gray-400">{placeholder}</span>
            )}
          </div>
          
          {/* Action Icons */}
          <div className="flex items-center space-x-1 ml-2">
            {value && !disabled && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="h-6 w-6 p-0 hover:bg-gray-200 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3 h-3" />
              </Button>
            )}
            <Clock className={cn(
              "w-4 h-4 flex-shrink-0",
              disabled ? "text-gray-300" : "text-gray-400"
            )} />
          </div>
        </div>
        
        {/* Status Indicator */}
        {value && (
          <div className="absolute -top-1 -right-1">
            <div className={cn(
              "w-3 h-3 rounded-full border-2 border-white",
              (() => {
                const selectedDate = new Date(value);
                const now = new Date();
                
                if (selectedDate < now) {
                  return 'bg-red-500';
                } else if (selectedDate.getTime() - now.getTime() < 24 * 60 * 60 * 1000) {
                  return 'bg-amber-500';
                } else {
                  return 'bg-green-500';
                }
              })()
            )} />
          </div>
        )}
      </div>
      
      {/* Helper Text */}
      {value && (
        <div className="text-xs text-gray-500 mt-1">
          Click to change date and time
        </div>
      )}
    </div>
  );
}
