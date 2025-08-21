import React, { useState } from 'react';
import { Button } from './button';
import { Input } from './input';
import { Badge } from './badge';
import { cn } from '@/lib/utils';
import { Plus, Minus, ArrowRight } from 'lucide-react';
import { Select } from './select';

interface ConditionItem {
  condition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  quantity: number;
}

interface ConditionPickerProps {
  itemName: string;
  totalQuantity: number;
  originalCondition: string;
  onConditionsChange: (conditions: ConditionItem[]) => void;
  className?: string;
}

interface TransferState {
  fromCondition: string;
  toCondition: string;
  quantity: number;
}

const conditionOptions = [
  { value: 'EXCELLENT', label: 'Excellent', color: 'bg-green-100 text-green-800 border-green-200' },
  { value: 'GOOD', label: 'Good', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'FAIR', label: 'Fair', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { value: 'POOR', label: 'Poor', color: 'bg-red-100 text-red-800 border-red-200' },
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
  const [transferState, setTransferState] = useState<TransferState>({
    fromCondition: '',
    toCondition: '',
    quantity: 1
  });
  const [showTransfer, setShowTransfer] = useState(false);

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
