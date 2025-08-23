import React, { useState } from 'react';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { Textarea } from './textarea';
import { ConditionPicker } from './condition-picker';
import { cn } from '@/lib/utils';
import { X, Calendar, Package, User, CheckCircle } from 'lucide-react';

interface ToolUnit {
  id: string;
  unitNumber: number;
  condition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  isAvailable: boolean;
  notes?: string;
}

interface BorrowedItem {
  id: string;
  name: string;
  units: ToolUnit[];
  type: 'tool' | 'material';
  quantity?: number;
  available?: number;
  originalCondition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
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
  const [formData, setFormData] = useState<{
    newDueDate?: string;
    reason?: string;
    notes?: string;
  }>({});
  const [itemConditions, setItemConditions] = useState<Record<string, Array<{
    condition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
    notes?: string;
  }>>>({});

  // Initialize form data when sidebar opens
  React.useEffect(() => {
    if (isOpen) {
      if (type === 'extend') {
        // Set default due date to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateStr = tomorrow.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:mm
        setFormData({
          newDueDate: dateStr,
          reason: ''
        });
      } else if (type === 'return') {
        // Reset item conditions
        setItemConditions({});
      }
    }
  }, [isOpen, type]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (type === 'return') {
      console.log('Processing return form submission...');
      console.log('Item conditions:', itemConditions);
      console.log('Borrowing items:', borrowing?.items);

      // First check if conditions are set for all items
      const missingConditions = borrowing?.items.some((item: BorrowedItem) =>
        !itemConditions[item.id] || itemConditions[item.id].length === 0
      );

      if (missingConditions) {
        alert('Please set conditions for all items');
        return;
      }

      // Prepare items with their conditions according to API schema
      const items = borrowing?.items.map((item: BorrowedItem) => {
        const itemCondition = itemConditions[item.id][0]; // Get the first condition

        // Create unit returns for each unit in the item
        const unitReturns = item.units.map(unit => ({
          borrowingItemUnitId: unit.id, // This should be the borrowing item unit ID
          returnCondition: itemCondition.condition,
          notes: itemCondition.notes || ''
        }));

        return {
          borrowingItemId: item.id,
          unitReturns: unitReturns
        };
      });

      console.log('Prepared return data:', {
        items: items,
        notes: formData.notes
      });

      onSubmit({
        items: items,
        notes: formData.notes
      });
    } else if (type === 'extend') {
      console.log('Processing extend form submission...');
      console.log('Form data:', formData);

      // Validate required fields
      if (!formData.newDueDate || !formData.reason) {
        alert('Please fill in all required fields');
        return;
      }

      // Validate new due date is in the future
      const newDueDate = new Date(formData.newDueDate);
      if (isNaN(newDueDate.getTime())) {
        alert('Please enter a valid date');
        return;
      }

      if (newDueDate <= new Date()) {
        alert('New due date must be in the future');
        return;
      }

      // Prepare data according to API schema (borrowingId comes from URL params)
      const extendData = {
        newDueDate: newDueDate.toISOString(),
        reason: formData.reason
      };

      console.log('Prepared extend data:', extendData);

      onSubmit(extendData);
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

            {/* Enhanced Return Form */}
            {type === 'return' && borrowing && (
              <div className="space-y-6">
                {/* Return Overview */}
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <Package className="w-4 h-4 text-green-600" />
                    <span className="font-medium text-green-800">Return Overview</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-green-700">Total Items:</span>
                      <span className="font-semibold ml-2">{borrowing.items.length}</span>
                    </div>
                    <div>
                      <span className="text-green-700">Total Units:</span>
                      <span className="font-semibold ml-2">
                        {borrowing.items.reduce((sum: number, item: BorrowedItem) => sum + item.units.length, 0)}
                      </span>
                    </div>
                    <div>
                      <span className="text-green-700">Borrowed Date:</span>
                      <span className="font-semibold ml-2">
                        {new Date(borrowing.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-green-700">Return Status:</span>
                      <span className="font-semibold ml-2 text-amber-600">
                        {new Date(borrowing.dueDate) < new Date() ? 'Overdue' : 'On Time'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Smart Defaults */}
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-blue-800">Quick Return Options</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Set all items to GOOD condition
                        const newConditions: any = {};
                        borrowing.items.forEach((item: BorrowedItem) => {
                          newConditions[item.id] = [{ condition: 'GOOD', notes: 'Returned in good condition' }];
                        });
                        setItemConditions(newConditions);
                      }}
                      className="text-xs hover:bg-blue-100"
                    >
                      ✅ All Good Condition
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Set all items to original condition
                        const newConditions: any = {};
                        borrowing.items.forEach((item: BorrowedItem) => {
                          newConditions[item.id] = [{ condition: item.originalCondition, notes: 'Returned in original condition' }];
                        });
                        setItemConditions(newConditions);
                      }}
                      className="text-xs hover:bg-blue-100"
                    >
                      🔄 Same as Borrowed
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Set all items to EXCELLENT condition
                        const newConditions: any = {};
                        borrowing.items.forEach((item: BorrowedItem) => {
                          newConditions[item.id] = [{ condition: 'EXCELLENT', notes: 'Returned in excellent condition' }];
                        });
                        setItemConditions(newConditions);
                      }}
                      className="text-xs hover:bg-blue-100"
                    >
                      ⭐ All Excellent
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Clear all conditions
                        setItemConditions({});
                      }}
                      className="text-xs hover:bg-red-100 text-red-600"
                    >
                      🗑️ Clear All
                    </Button>
                  </div>
                </div>

                {/* Item Condition Pickers */}
                <div className="space-y-4">
                  <Label className="text-base font-medium">Return Conditions by Item</Label>
                  <p className="text-sm text-muted-foreground">
                    Use <strong>Bulk Mode</strong> for quick setup or <strong>Individual Mode</strong> for detailed customization.
                  </p>

                  {borrowing.items.map((item: BorrowedItem) => (
                    <ConditionPicker
                      key={item.id}
                      itemName={item.name}
                      units={item.units}
                      currentCondition={item.originalCondition}
                      onConditionsChange={(conditions: Array<{ condition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'; notes?: string }>) => {
                        setItemConditions((prev) => ({
                          ...prev,
                          [item.id]: conditions
                        }));
                      }}
                    />
                  ))}
                </div>

                {/* Return Notes */}
                <div className="space-y-3">
                  <Label htmlFor="notes" className="font-medium">Return Notes (Optional)</Label>

                  {/* Quick Notes Templates */}
                  <div className="flex flex-wrap gap-2 mb-2">
                    {[
                      'All items returned in good condition',
                      'Some wear and tear observed',
                      'Items cleaned before return',
                      'No issues during usage',
                      'Minor damage noted'
                    ].map((template) => (
                      <Button
                        key={template}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setFormData((prev: any) => ({ ...prev, notes: template }))}
                        className="text-xs hover:bg-gray-100"
                      >
                        {template}
                      </Button>
                    ))}
                  </div>

                  <Textarea
                    id="notes"
                    placeholder="Any additional notes about the returned items..."
                    value={formData.notes || ''}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, notes: e.target.value }))}
                    className="mt-1 min-h-[80px]"
                  />
                  <div className="text-xs text-gray-500">
                    {formData.notes?.length || 0}/500 characters
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced Extend Form */}
            {type === 'extend' && borrowing && (
              <div className="space-y-6">
                {/* Current Due Date Info */}
                <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <Calendar className="w-4 h-4 text-amber-600" />
                    <span className="font-medium text-amber-800">Current Due Date</span>
                  </div>
                  <p className="text-amber-700">
                    {new Date(borrowing.dueDate).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                  <p className="text-sm text-amber-600 mt-1">
                    {new Date(borrowing.dueDate) < new Date()
                      ? `⚠️ Overdue by ${Math.ceil((new Date().getTime() - new Date(borrowing.dueDate).getTime()) / (1000 * 60 * 60 * 24))} days`
                      : `Due in ${Math.ceil((new Date(borrowing.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days`
                    }
                  </p>
                </div>

                {/* Quick Extension Options */}
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <Label className="font-medium text-blue-800 mb-3 block">Quick Extension Options</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { days: 7, label: '1 Week' },
                      { days: 14, label: '2 Weeks' },
                      { days: 30, label: '1 Month' },
                      { days: 60, label: '2 Months' }
                    ].map((option) => {
                      const newDate = new Date();
                      newDate.setDate(newDate.getDate() + option.days);
                      return (
                        <Button
                          key={option.days}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setFormData((prev: any) => ({
                              ...prev,
                              newDueDate: newDate.toISOString().slice(0, 16)
                            }));
                          }}
                          className="text-xs hover:bg-blue-100 hover:border-blue-300"
                        >
                          +{option.label}
                          <br />
                          <span className="text-xs text-gray-500">
                            {newDate.toLocaleDateString()}
                          </span>
                        </Button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Date Selection */}
                <div className="space-y-3">
                  <Label htmlFor="newDueDate" className="font-medium">Custom Due Date</Label>
                  <Input
                    id="newDueDate"
                    type="datetime-local"
                    value={formData.newDueDate || ''}
                    onChange={(e) => setFormData((prev: any) => ({
                      ...prev,
                      newDueDate: e.target.value
                    }))}
                    className="mt-1"
                    min={new Date().toISOString().slice(0, 16)}
                    required
                  />
                  {formData.newDueDate && (
                    <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                      📅 New due date: {new Date(formData.newDueDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                      <br />
                      ⏱️ Extension: {Math.ceil((new Date(formData.newDueDate).getTime() - new Date(borrowing.dueDate).getTime()) / (1000 * 60 * 60 * 24))} days
                    </div>
                  )}
                </div>

                {/* Reason with Templates */}
                <div className="space-y-3">
                  <Label htmlFor="reason" className="font-medium">Reason for Extension</Label>

                  {/* Quick Reason Templates */}
                  <div className="flex flex-wrap gap-2 mb-2">
                    {[
                      'Project delayed',
                      'Equipment still in use',
                      'Waiting for replacement',
                      'Extended research period',
                      'Technical difficulties'
                    ].map((template) => (
                      <Button
                        key={template}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setFormData((prev: any) => ({ ...prev, reason: template }))}
                        className="text-xs hover:bg-gray-100"
                      >
                        {template}
                      </Button>
                    ))}
                  </div>

                  <Textarea
                    id="reason"
                    placeholder="Please provide a detailed reason for extending the due date..."
                    value={formData.reason || ''}
                    onChange={(e) => setFormData((prev: any) => ({ ...prev, reason: e.target.value }))}
                    className="mt-1 min-h-[80px]"
                    required
                  />
                  <div className="text-xs text-gray-500">
                    {formData.reason?.length || 0}/500 characters
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced Action Buttons */}
            <div className="bg-gray-50 rounded-lg p-4 border-t border-gray-200">
              {/* Progress Indicator for Return */}
              {type === 'return' && borrowing && (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600">Return Progress</span>
                    <span className="font-medium">
                      {Object.keys(itemConditions).length} / {borrowing.items.length} items configured
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${(Object.keys(itemConditions).length / borrowing.items.length) * 100}%`
                      }}
                    ></div>
                  </div>
                  {Object.keys(itemConditions).length < borrowing.items.length && (
                    <p className="text-xs text-amber-600 mt-1">
                      ⚠️ Please configure return conditions for all items before proceeding
                    </p>
                  )}
                </div>
              )}

              {/* Progress Indicator for Extend */}
              {type === 'extend' && (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600">Extension Form</span>
                    <span className="font-medium">
                      {(formData.newDueDate && formData.reason) ? 'Complete' : 'Incomplete'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${((formData.newDueDate ? 50 : 0) + (formData.reason ? 50 : 0))}%`
                      }}
                    ></div>
                  </div>
                </div>
              )}

              <div className="flex space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 hover:bg-gray-100"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className={cn(
                    "flex-1 transition-all duration-200",
                    type === 'return'
                      ? "bg-green-500 hover:bg-green-600 text-white"
                      : "bg-blue-500 hover:bg-blue-600 text-white"
                  )}
                  disabled={
                    type === 'return'
                      ? Object.keys(itemConditions).length < (borrowing?.items.length || 0)
                      : !formData.newDueDate || !formData.reason
                  }
                >
                  {type === 'return' ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Process Return
                    </>
                  ) : (
                    <>
                      <Calendar className="w-4 h-4 mr-2" />
                      Extend Due Date
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
