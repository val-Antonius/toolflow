import React, { useState } from 'react';
import { Button } from './button';
import { Input } from './input';
import { Badge } from './badge';
import { cn } from '@/lib/utils';
import { Plus, Minus, ArrowRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';

interface ToolUnit {
  id: string;
  condition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  isAvailable: boolean;
}

interface Unit {
  id: string;
  unitNumber: number;
  condition: string;
  isAvailable: boolean;
  notes?: string;
}

interface ConditionPickerProps {
  itemName: string;
  units: Unit[];
  onUnitConditionsChange: (updates: Array<{ unitId: string; condition: string; notes?: string }>) => void;
  className?: string;
}

interface UnitUpdate {
  unitId: string;
  currentCondition: string;
  newCondition: string;
  notes?: string;
}

const conditionOptions = [
  { value: 'EXCELLENT', label: 'Excellent', color: 'bg-green-100 text-green-800 border-green-200' },
  { value: 'GOOD', label: 'Good', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'FAIR', label: 'Fair', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { value: 'POOR', label: 'Poor', color: 'bg-red-100 text-red-800 border-red-200' },
];

export function ConditionPicker({ 
  itemName, 
  units, 
  onUnitConditionsChange, 
  className 
}: ConditionPickerProps) {
  const [unitUpdates, setUnitUpdates] = useState<Record<string, { condition: string; notes?: string }>>({});
  const [showNotes, setShowNotes] = useState<Record<string, boolean>>({});

  const updateQuantity = (index: number, newQuantity: number) => {
    const updatedConditions = [...conditions];
    const oldQuantity = updatedConditions[index].quantity;
    const diff = newQuantity - oldQuantity;
    
    // Check if the new total would exceed totalQuantity
    const currentTotal = conditions.reduce((sum, item, i) => 
      sum + (i === index ? newQuantity : item.quantity), 0);
    
    if (currentTotal > totalQuantity) {
      alert(`Total quantity cannot exceed ${totalQuantity}`);
      return;
    }

    updatedConditions[index].quantity = Math.max(0, newQuantity);
    
    // Remove items with 0 quantity
    const filteredConditions = updatedConditions.filter(item => item.quantity > 0);
    
    setConditions(filteredConditions);
    onConditionsChange(filteredConditions);
  };

  const handleTransfer = () => {
    if (!transferState.fromCondition || !transferState.toCondition || transferState.quantity <= 0) {
      alert('Please select source and destination conditions and enter a valid quantity');
      return;
    }

    const fromIndex = conditions.findIndex(item => item.condition === transferState.fromCondition);
    if (fromIndex === -1) {
      alert('Source condition not found');
      return;
    }

    if (conditions[fromIndex].quantity < transferState.quantity) {
      alert(`Cannot transfer ${transferState.quantity} items. Only ${conditions[fromIndex].quantity} available.`);
      return;
    }

    // Update or add destination condition
    const toIndex = conditions.findIndex(item => item.condition === transferState.toCondition);
    const updatedConditions = [...conditions];

    if (toIndex >= 0) {
      updatedConditions[toIndex].quantity += transferState.quantity;
    } else {
      updatedConditions.push({
        condition: transferState.toCondition as any,
        quantity: transferState.quantity
      });
    }

    // Reduce quantity from source
    updatedConditions[fromIndex].quantity -= transferState.quantity;

    // Filter out any conditions with 0 quantity
    const filteredConditions = updatedConditions.filter(item => item.quantity > 0);
    
    setConditions(filteredConditions);
    onConditionsChange(filteredConditions);
    setShowTransfer(false);
    setTransferState({
      fromCondition: '',
      toCondition: '',
      quantity: 1
    });
  };

  const totalAssigned = conditions.reduce((sum, item) => sum + item.quantity, 0);
  const remaining = totalQuantity - totalAssigned;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">{itemName}</h4>
        <div className="text-sm text-muted-foreground">
          Total Units: {units.length} | Updated: {Object.keys(unitUpdates).length}
        </div>
      </div>
      
      <div className="space-y-3">
        {units.map((unit) => (
          <div key={unit.id} className="p-3 rounded-lg border bg-white/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Badge className={cn("text-xs", getConditionColor(unit.condition))}>
                  Unit {unit.unitNumber}
                </Badge>
                <span className="text-sm font-medium">
                  Current: {unit.condition}
                </span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowNotes({ ...showNotes, [unit.id]: !showNotes[unit.id] })}
              >
                {showNotes[unit.id] ? 'Hide Notes' : 'Add Notes'}
              </Button>
            </div>

            <div className="space-y-2">
              <Select
                value={unitUpdates[unit.id]?.condition || unit.condition}
                onValueChange={(value) => {
                  setUnitUpdates(prev => ({
                    ...prev,
                    [unit.id]: { ...prev[unit.id], condition: value }
                  }));
                  onUnitConditionsChange(
                    Object.entries({
                      ...unitUpdates,
                      [unit.id]: { ...unitUpdates[unit.id], condition: value }
                    }).map(([unitId, update]) => ({
                      unitId,
                      condition: update.condition,
                      notes: update.notes
                    }))
                  );
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {conditionOptions.map(cond => (
                    <SelectItem key={cond.value} value={cond.value}>
                      {cond.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {showNotes[unit.id] && (
                <Input
                  placeholder="Add notes about condition change..."
                  value={unitUpdates[unit.id]?.notes || ''}
                  onChange={(e) => {
                    setUnitUpdates(prev => ({
                      ...prev,
                      [unit.id]: { ...prev[unit.id], notes: e.target.value }
                    }));
                    onUnitConditionsChange(
                      Object.entries({
                        ...unitUpdates,
                        [unit.id]: { ...unitUpdates[unit.id], notes: e.target.value }
                      }).map(([unitId, update]) => ({
                        unitId,
                        condition: update.condition,
                        notes: update.notes
                      }))
                    );
                  }}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Current Conditions */}
      <div className="space-y-2">
        {conditions.map((item, index) => {
          const conditionInfo = conditionOptions.find(opt => opt.value === item.condition);
          return (
            <div key={`${item.condition}-${index}`} className="flex items-center justify-between p-3 rounded-lg border bg-gray-50/50">
              <div className="flex items-center space-x-3">
                <Badge className={cn("text-xs", conditionInfo?.color)}>
                  {conditionInfo?.label}
                </Badge>
                <span className="text-sm">Quantity: {item.quantity}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Transfer Between Conditions */}
      <div className="space-y-4 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Transfer Items</h4>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowTransfer(!showTransfer)}
          >
            {showTransfer ? 'Hide Transfer' : 'Show Transfer'}
          </Button>
        </div>

        {showTransfer && (
          <div className="p-4 rounded-lg border bg-gray-50/50 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">From Condition</label>
                <select
                  className="w-full rounded-md border border-gray-300 p-2"
                  value={transferState.fromCondition}
                  onChange={(e) => setTransferState(prev => ({ ...prev, fromCondition: e.target.value }))}
                >
                  <option value="">Select condition</option>
                  {conditions.map((item) => (
                    <option key={item.condition} value={item.condition}>
                      {conditionOptions.find(opt => opt.value === item.condition)?.label} ({item.quantity} available)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">To Condition</label>
                <select
                  className="w-full rounded-md border border-gray-300 p-2"
                  value={transferState.toCondition}
                  onChange={(e) => setTransferState(prev => ({ ...prev, toCondition: e.target.value }))}
                >
                  <option value="">Select condition</option>
                  {conditionOptions
                    .filter(opt => opt.value !== transferState.fromCondition)
                    .map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Quantity to Transfer</label>
              <div className="flex items-center space-x-2">
                <Input
                  type="number"
                  value={transferState.quantity}
                  onChange={(e) => setTransferState(prev => ({ 
                    ...prev, 
                    quantity: Math.max(1, parseInt(e.target.value) || 0)
                  }))}
                  min="1"
                  max={conditions.find(c => c.condition === transferState.fromCondition)?.quantity || 0}
                  className="w-24"
                />
                <Button
                  onClick={handleTransfer}
                  disabled={!transferState.fromCondition || !transferState.toCondition || transferState.quantity <= 0}
                >
                  Transfer <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {remaining > 0 && (
        <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
          <p className="text-sm text-yellow-800">
            ⚠️ {remaining} item(s) not assigned to any condition. Please assign all items before continuing.
          </p>
        </div>
      )}
    </div>
  );
}
