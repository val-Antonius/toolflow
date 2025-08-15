import React, { useState } from 'react';
import { Button } from './button';
import { Input } from './input';
import { Badge } from './badge';
import { cn } from '@/lib/utils';
import { Plus, Minus } from 'lucide-react';

interface ConditionItem {
  condition: 'good' | 'fair' | 'poor';
  quantity: number;
}

interface ConditionPickerProps {
  itemName: string;
  totalQuantity: number;
  originalCondition: string;
  onConditionsChange: (conditions: ConditionItem[]) => void;
  className?: string;
}

const conditionOptions = [
  { value: 'good', label: 'Baik', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'fair', label: 'Cukup', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { value: 'poor', label: 'Buruk', color: 'bg-red-100 text-red-800 border-red-200' },
];

export function ConditionPicker({ 
  itemName, 
  totalQuantity, 
  originalCondition, 
  onConditionsChange, 
  className 
}: ConditionPickerProps) {
  const [conditions, setConditions] = useState<ConditionItem[]>([
    { condition: originalCondition as any, quantity: totalQuantity }
  ]);

  const updateQuantity = (index: number, newQuantity: number) => {
    const updatedConditions = [...conditions];
    updatedConditions[index].quantity = Math.max(0, newQuantity);
    
    // Remove items with 0 quantity
    const filteredConditions = updatedConditions.filter(item => item.quantity > 0);
    
    setConditions(filteredConditions);
    onConditionsChange(filteredConditions);
  };

  const addCondition = (condition: 'good' | 'fair' | 'poor') => {
    const existingIndex = conditions.findIndex(item => item.condition === condition);

    if (existingIndex >= 0) {
      updateQuantity(existingIndex, conditions[existingIndex].quantity + 1);
    } else {
      const newConditions = [...conditions, { condition, quantity: 1 }];
      setConditions(newConditions);
      onConditionsChange(newConditions);
    }

    // Reduce from the first available condition with quantity > 1
    const sourceIndex = conditions.findIndex(item => item.quantity > 1);
    if (sourceIndex >= 0) {
      updateQuantity(sourceIndex, conditions[sourceIndex].quantity - 1);
    }
  };

  const totalAssigned = conditions.reduce((sum, item) => sum + item.quantity, 0);
  const remaining = totalQuantity - totalAssigned;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">{itemName}</h4>
        <div className="text-sm text-muted-foreground">
          Total: {totalQuantity} | Assigned: {totalAssigned}
          {remaining > 0 && <span className="text-yellow-600 ml-2">Remaining: {remaining}</span>}
        </div>
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
                <span className="text-sm">Quantity:</span>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateQuantity(index, item.quantity - 1)}
                  disabled={item.quantity <= 1 && conditions.length === 1}
                >
                  <Minus className="w-3 h-3" />
                </Button>
                <Input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => {
                    e.stopPropagation();
                    updateQuantity(index, parseInt(e.target.value) || 0);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-16 text-center"
                  min="0"
                  max={totalQuantity}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateQuantity(index, item.quantity + 1)}
                  disabled={totalAssigned >= totalQuantity}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add New Condition */}
      {totalAssigned < totalQuantity && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Add items to different condition:</p>
          <div className="flex flex-wrap gap-2">
            {conditionOptions.map((option) => (
              <Button
                key={option.value}
                size="sm"
                variant="outline"
                onClick={() => addCondition(option.value as any)}
                className="text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      )}

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
