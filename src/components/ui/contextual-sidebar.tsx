import React, { useState } from 'react';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { Textarea } from './textarea';
import { ConditionPicker } from './condition-picker';
import { cn } from '@/lib/utils';
import { X, Calendar, Package, User } from 'lucide-react';

interface BorrowedItem {
  id: string;
  name: string;
  quantity: number;
  originalCondition: string;
}

interface SidebarFormProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'return' | 'extend' | 'borrow' | 'consume';
  borrowing?: {
    id: string;
    borrower: string;
    items: BorrowedItem[];
    dueDate: string;
    purpose: string;
  };
  onSubmit: (formData: any) => void;
}

export function ContextualSidebar({ isOpen, onClose, type, borrowing, onSubmit }: SidebarFormProps) {
  const [formData, setFormData] = useState<any>({});
  const [itemConditions, setItemConditions] = useState<Record<string, any>>({});

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (type === 'return') {
      onSubmit({
        borrowingId: borrowing?.id,
        items: borrowing?.items.map(item => ({
          ...item,
          returnConditions: itemConditions[item.id] || []
        })),
        notes: formData.notes,
        returnDate: new Date().toISOString()
      });
    } else if (type === 'extend') {
      onSubmit({
        borrowingId: borrowing?.id,
        newDueDate: formData.newDueDate,
        reason: formData.reason
      });
    }
    
    onClose();
  };

  const getTitle = () => {
    switch (type) {
      case 'return': return 'Return Items';
      case 'extend': return 'Extend Due Date';
      case 'borrow': return 'Borrow Items';
      case 'consume': return 'Consume Materials';
      default: return 'Form';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className="ml-auto w-full max-w-lg glass border-l border-white/20 h-full overflow-y-auto transition-all-smooth">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              {type === 'return' && <Package className="w-5 h-5 text-primary" />}
              {type === 'extend' && <Calendar className="w-5 h-5 text-primary" />}
              <h2 className="text-xl font-semibold">{getTitle()}</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Borrower Info (for returns/extends) */}
            {(type === 'return' || type === 'extend') && borrowing && (
              <div className="p-4 rounded-lg bg-blue-50/50 border border-blue-200">
                <div className="flex items-center space-x-2 mb-2">
                  <User className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-blue-900">Borrower Information</span>
                </div>
                <div className="space-y-1 text-sm">
                  <p><strong>Name:</strong> {borrowing.borrower}</p>
                  <p><strong>Due Date:</strong> {borrowing.dueDate}</p>
                  <p><strong>Purpose:</strong> {borrowing.purpose}</p>
                </div>
              </div>
            )}

            {/* Return Form */}
            {type === 'return' && borrowing && (
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">Return Conditions</Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    Specify the condition of each item being returned. You can distribute quantities across different conditions.
                  </p>
                </div>

                {borrowing.items.map((item) => (
                  <ConditionPicker
                    key={item.id}
                    itemName={item.name}
                    totalQuantity={item.quantity}
                    originalCondition={item.originalCondition}
                    onConditionsChange={(conditions) => {
                      setItemConditions((prev: Record<string, any>) => ({
                        ...prev,
                        [item.id]: conditions
                      }));
                    }}
                  />
                ))}

                <div>
                  <Label htmlFor="notes">Return Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any additional notes about the returned items..."
                    value={formData.notes || ''}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, notes: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            {/* Extend Form */}
            {type === 'extend' && borrowing && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="newDueDate">New Due Date</Label>
                  <Input
                    id="newDueDate"
                    type="date"
                    value={formData.newDueDate || ''}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, newDueDate: e.target.value }))}
                    className="mt-1"
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="reason">Reason for Extension</Label>
                  <Textarea
                    id="reason"
                    placeholder="Please provide a reason for extending the due date..."
                    value={formData.reason || ''}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, reason: e.target.value }))}
                    className="mt-1"
                    required
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4 border-t border-gray-200">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                {type === 'return' ? 'Process Return' : 'Extend Due Date'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
