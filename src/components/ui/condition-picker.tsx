import React, { useState } from 'react';
import { Button } from './button';
import { Input } from './input';
import { Badge } from './badge';
import { Label } from './label';
import { Textarea } from './textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { cn } from '@/lib/utils';
import { Package, Edit, CheckCircle } from 'lucide-react';

interface ToolUnit {
  id: string;
  condition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  isAvailable: boolean;
  unitNumber?: number;
  notes?: string;
}

interface Unit {
  id: string;
  condition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  isAvailable: boolean;
  unitNumber?: number;
  notes?: string;
}

interface ConditionPickerProps {
  itemName: string;
  units: Unit[];
  currentCondition?: string;
  onConditionsChange?: (conditions: Array<{ condition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'; notes?: string }>) => void;
  onUnitConditionsChange?: (updates: Array<{ unitId: string; condition: string; notes?: string }>) => void;
  className?: string;
}

const conditionOptions = [
  { value: 'EXCELLENT', label: 'Excellent', color: 'bg-green-100 text-green-800 border-green-200' },
  { value: 'GOOD', label: 'Good', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'FAIR', label: 'Fair', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { value: 'POOR', label: 'Poor', color: 'bg-red-100 text-red-800 border-red-200' },
];

const getConditionColor = (condition: string) => {
  const conditionInfo = conditionOptions.find(opt => opt.value === condition);
  return conditionInfo?.color || 'bg-gray-100 text-gray-800 border-gray-200';
};

export function ConditionPicker({ 
  itemName, 
  units, 
  currentCondition,
  onConditionsChange,
  onUnitConditionsChange, 
  className 
}: ConditionPickerProps) {
  const [selectionMode, setSelectionMode] = useState<'bulk' | 'individual'>('bulk');
  const [bulkCondition, setBulkCondition] = useState<'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'>('GOOD');
  const [bulkNotes, setBulkNotes] = useState('');
  const [unitUpdates, setUnitUpdates] = useState<Record<string, { condition: string; notes?: string }>>({});

  const totalQuantity = units.length;

  const applyBulkCondition = (condition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR', notes?: string) => {
    const newUnitUpdates: Record<string, { condition: string; notes?: string }> = {};
    units.forEach(unit => {
      newUnitUpdates[unit.id] = { condition, notes: notes || '' };
    });
    setUnitUpdates(newUnitUpdates);
    setBulkCondition(condition);
    setBulkNotes(notes || '');

    // ✅ FIXED: Don't auto-trigger callback, let user submit manually
    // Only update internal state, callback will be triggered on manual submit
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with Mode Selection */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">Return Conditions for {itemName}</h3>
          <div className="text-sm text-gray-600">
            Total Units: <span className="font-semibold text-blue-600">{totalQuantity}</span> | 
            Updated: <span className="font-semibold text-green-600">{Object.keys(unitUpdates).length}</span>
          </div>
        </div>
        
        {/* Mode Selection */}
        <div className="flex items-center justify-between">
          <div className="flex bg-white rounded-lg p-1 border shadow-sm">
            <button
              type="button"
              onClick={() => setSelectionMode('bulk')}
              className={cn(
                "px-4 py-2 text-sm rounded transition-all flex items-center space-x-2",
                selectionMode === 'bulk' 
                  ? "bg-blue-500 text-white shadow-sm" 
                  : "text-gray-600 hover:text-gray-800"
              )}
            >
              <Package className="w-4 h-4" />
              <span>Bulk Mode</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectionMode('individual')}
              className={cn(
                "px-4 py-2 text-sm rounded transition-all flex items-center space-x-2",
                selectionMode === 'individual' 
                  ? "bg-blue-500 text-white shadow-sm" 
                  : "text-gray-600 hover:text-gray-800"
              )}
            >
              <Edit className="w-4 h-4" />
              <span>Individual Mode</span>
            </button>
          </div>
          
          <div className="text-xs text-gray-500 bg-white px-3 py-1 rounded border">
            💡 <strong>Bulk Mode:</strong> Set all units at once | <strong>Individual:</strong> Customize each unit
          </div>
        </div>
      </div>

      {/* Bulk Mode Interface */}
      {selectionMode === 'bulk' && (
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
            <Package className="w-5 h-5 mr-2 text-blue-500" />
            Bulk Return Configuration
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Return Condition for All Units</Label>
              <Select value={bulkCondition} onValueChange={(value: any) => setBulkCondition(value)}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {conditionOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center space-x-2">
                        <Badge className={cn("text-xs", option.color)}>
                          {option.label}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Notes for All Units (Optional)</Label>
              <Input
                value={bulkNotes}
                onChange={(e) => setBulkNotes(e.target.value)}
                placeholder="Add notes for all units..."
                className="h-10"
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              This will set <span className="font-semibold text-blue-600">{totalQuantity} units</span> to 
              <Badge className={cn("ml-2 text-xs", getConditionColor(bulkCondition))}>
                {conditionOptions.find(opt => opt.value === bulkCondition)?.label}
              </Badge>
            </div>
            
            <Button
              onClick={() => {
                applyBulkCondition(bulkCondition, bulkNotes);
                // Now trigger the callback after user explicitly clicks apply
                if (onConditionsChange) {
                  onConditionsChange([{ condition: bulkCondition, notes: bulkNotes }]);
                }
              }}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Apply to All Units
            </Button>
          </div>
          

        </div>
      )}
      
      {/* Individual Mode Interface */}
      {selectionMode === 'individual' && (
        <div className="space-y-4">
          <div className="space-y-3">
            {units.map((unit) => (
            <div key={unit.id} className="p-3 rounded-lg border bg-white/50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Badge className={cn("text-xs", getConditionColor(unit.condition))}>
                    Unit {unit.unitNumber || 1}
                  </Badge>
                  <span className="text-sm font-medium">
                    Current: {unit.condition}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Select
                  value={unitUpdates[unit.id]?.condition || unit.condition}
                  onValueChange={(value) => {
                    setUnitUpdates(prev => ({
                      ...prev,
                      [unit.id]: { ...prev[unit.id], condition: value }
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {conditionOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center space-x-2">
                          <Badge className={cn("text-xs", option.color)}>
                            {option.label}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  placeholder="Add notes for this unit..."
                  value={unitUpdates[unit.id]?.notes || ''}
                  onChange={(e) => {
                    setUnitUpdates(prev => ({
                      ...prev,
                      [unit.id]: { ...prev[unit.id], notes: e.target.value }
                    }));
                  }}
                />
              </div>
            </div>
            ))}
          </div>

          {/* Apply Individual Changes Button */}
          {Object.keys(unitUpdates).length > 0 && (
            <div className="pt-4 border-t border-gray-200">
              <Button
                onClick={() => {
                  // Convert individual unit updates to conditions array
                  const conditions = Object.values(unitUpdates).map(update => ({
                    condition: update.condition as 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR',
                    notes: update.notes || ''
                  }));

                  if (onConditionsChange) {
                    onConditionsChange(conditions);
                  }
                }}
                className="w-full bg-green-500 hover:bg-green-600 text-white"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Apply Individual Changes ({Object.keys(unitUpdates).length} units)
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Return Summary */}
      <div className="bg-gray-50 rounded-xl p-4 border">
        <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
          <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
          Return Summary
        </h4>
        <div className="text-sm text-gray-600">
          {Object.keys(unitUpdates).length > 0 ? (
            <p>✅ {Object.keys(unitUpdates).length} of {totalQuantity} units configured</p>
          ) : (
            <p>⚠️ No units configured yet. Please set return conditions.</p>
          )}
        </div>
      </div>
    </div>
  );
}
