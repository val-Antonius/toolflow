import React, { useState } from 'react';
import { Button } from './button';
import { Label } from './label';
import { Textarea } from './textarea';
import { ConditionPicker } from './condition-picker';
import { DateTimePicker } from './datetime-picker';
import { cn } from '@/lib/utils';
import { X, Calendar, Package, User, CheckCircle, AlertTriangle } from 'lucide-react';

interface ToolUnit {
  id: string;
  displayId?: string;
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

interface FormData {
  newDueDate?: string;
  reason?: string;
  notes?: string;
}

interface ReturnFormData {
  items: Array<{
    borrowingItemId: string;
    unitReturns: Array<{
      borrowingItemUnitId: string;
      returnCondition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
      notes?: string;
    }>;
  }>;
  notes?: string;
}

interface ExtendFormData {
  newDueDate: string;
  reason: string;
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
  onSubmit: (formData: ReturnFormData | ExtendFormData | unknown) => void;
}

export function ContextualSidebar({ isOpen, onClose, type, borrowing, onSubmit }: SidebarFormProps) {
  const [formData, setFormData] = useState<FormData>({});
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

            {/* Enhanced Return Form */}
            {type === 'return' && borrowing && (
              <div className="space-y-6">
                {/* Combined Borrower & Return Information */}
                <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-xl p-5 border border-blue-200/60 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Return Information</h3>
                        <p className="text-xs text-gray-600">Borrower details and return overview</p>
                      </div>
                    </div>
                    <div className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium",
                      new Date(borrowing.dueDate) < new Date()
                        ? "bg-red-100 text-red-700 border border-red-200"
                        : "bg-green-100 text-green-700 border border-green-200"
                    )}>
                      {new Date(borrowing.dueDate) < new Date() ? 'Overdue' : 'On Time'}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Borrower Details */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-sm font-medium text-gray-700">Borrower Details</span>
                      </div>
                      <div className="space-y-2 text-sm pl-4">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Name:</span>
                          <span className="font-medium text-gray-900">{borrowing.borrower}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Due Date:</span>
                          <span className="font-medium text-gray-900">
                            {new Date(borrowing.dueDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                        <div className="pt-1">
                          <span className="text-gray-600 block mb-1">Purpose:</span>
                          <p className="text-gray-900 text-xs bg-white/60 p-2 rounded border">
                            {borrowing.purpose}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Return Statistics */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm font-medium text-gray-700">Return Statistics</span>
                      </div>
                      <div className="space-y-2 text-sm pl-4">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Items:</span>
                          <span className="font-semibold text-gray-900">{borrowing.items.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Units:</span>
                          <span className="font-semibold text-gray-900">
                            {borrowing.items.reduce((sum: number, item: BorrowedItem) => sum + item.units.length, 0)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Borrowed Date:</span>
                          <span className="font-medium text-gray-900">
                            {new Date(borrowing.dueDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Days Overdue:</span>
                          <span className={cn(
                            "font-semibold",
                            new Date(borrowing.dueDate) < new Date() ? "text-red-600" : "text-green-600"
                          )}>
                            {new Date(borrowing.dueDate) < new Date()
                              ? `+${Math.ceil((new Date().getTime() - new Date(borrowing.dueDate).getTime()) / (1000 * 60 * 60 * 24))}`
                              : '0'
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>



                {/* Bulk Return Configuration */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">Bulk Return Configuration</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Configure return conditions for all items efficiently
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="text-xs text-gray-500">
                          {Object.keys(itemConditions).length}/{borrowing.items.length} configured
                        </div>
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${(Object.keys(itemConditions).length / borrowing.items.length) * 100}%`
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4">
                    {/* Quick Actions */}
                    <div className="mb-4">
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">Quick Actions</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newConditions: Record<string, Array<{ condition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'; notes?: string }>> = {};
                            borrowing.items.forEach((item: BorrowedItem) => {
                              newConditions[item.id] = [{ condition: 'GOOD', notes: 'Returned in good condition' }];
                            });
                            setItemConditions(newConditions);
                          }}
                          className="text-xs hover:bg-green-50 hover:border-green-200 hover:text-green-700"
                        >
                          ✅ All Good Condition
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newConditions: Record<string, Array<{ condition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'; notes?: string }>> = {};
                            borrowing.items.forEach((item: BorrowedItem) => {
                              newConditions[item.id] = [{ condition: item.originalCondition, notes: 'Returned in original condition' }];
                            });
                            setItemConditions(newConditions);
                          }}
                          className="text-xs hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700"
                        >
                          🔄 Same as Borrowed
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newConditions: Record<string, Array<{ condition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'; notes?: string }>> = {};
                            borrowing.items.forEach((item: BorrowedItem) => {
                              newConditions[item.id] = [{ condition: 'EXCELLENT', notes: 'Returned in excellent condition' }];
                            });
                            setItemConditions(newConditions);
                          }}
                          className="text-xs hover:bg-yellow-50 hover:border-yellow-200 hover:text-yellow-700"
                        >
                          ⭐ All Excellent
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setItemConditions({});
                          }}
                          className="text-xs hover:bg-red-50 hover:border-red-200 hover:text-red-700"
                        >
                          🗑️ Clear All
                        </Button>
                      </div>
                    </div>

                    {/* Individual Item Configuration */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-gray-700">Individual Item Configuration</Label>
                      {borrowing.items.map((item: BorrowedItem) => (
                        <ConditionPicker
                          key={item.id}
                          itemName={item.name}
                          units={item.units}
                          onConditionsChange={(conditions: Array<{ condition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'; notes?: string }>) => {
                            setItemConditions((prev) => ({
                              ...prev,
                              [item.id]: conditions
                            }));
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Return Notes */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                  <div className="p-4 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900">Return Notes</h3>
                    <p className="text-sm text-gray-600 mt-1">Add any additional comments about the return (optional)</p>
                  </div>
                  <div className="p-4 space-y-4">
                    {/* Quick Notes Templates */}
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">Quick Templates</Label>
                      <div className="flex flex-wrap gap-2">
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
                            onClick={() => setFormData((prev) => ({ ...prev, notes: template }))}
                            className={cn(
                              "text-xs transition-all duration-200",
                              formData.notes === template
                                ? "bg-green-100 border-green-300 text-green-700"
                                : "hover:bg-gray-50 hover:border-gray-300"
                            )}
                          >
                            {template}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="notes" className="text-sm font-medium text-gray-700">Additional Notes</Label>
                      <Textarea
                        id="notes"
                        placeholder="Any additional notes about the returned items..."
                        value={formData.notes || ''}
                        onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                        className="mt-2 min-h-[80px]"
                      />
                      <div className="flex justify-between items-center mt-2">
                        <div className="text-xs text-gray-500">
                          {formData.notes?.length || 0}/500 characters
                        </div>
                        {formData.notes && formData.notes.length > 0 && (
                          <div className="text-xs text-green-600">✓ Notes added</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced Extend Form */}
            {type === 'extend' && borrowing && (
              <div className="space-y-6">
                {/* Combined Borrower & Extension Information */}
                <div className="bg-gradient-to-br from-blue-50 to-amber-50 rounded-xl p-5 border border-amber-200/60 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
                        <Calendar className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Extension Information</h3>
                        <p className="text-xs text-gray-600">Borrower details and current due date</p>
                      </div>
                    </div>
                    <div className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium",
                      new Date(borrowing.dueDate) < new Date()
                        ? "bg-red-100 text-red-700 border border-red-200"
                        : "bg-green-100 text-green-700 border border-green-200"
                    )}>
                      {new Date(borrowing.dueDate) < new Date()
                        ? `Overdue ${Math.ceil((new Date().getTime() - new Date(borrowing.dueDate).getTime()) / (1000 * 60 * 60 * 24))}d`
                        : `Due in ${Math.ceil((new Date(borrowing.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}d`
                      }
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Borrower Details */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-sm font-medium text-gray-700">Borrower Details</span>
                      </div>
                      <div className="space-y-2 text-sm pl-4">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Name:</span>
                          <span className="font-medium text-gray-900">{borrowing.borrower}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Items:</span>
                          <span className="font-medium text-gray-900">{borrowing.items.length} items</span>
                        </div>
                        <div className="pt-1">
                          <span className="text-gray-600 block mb-1">Purpose:</span>
                          <p className="text-gray-900 text-xs bg-white/60 p-2 rounded border">
                            {borrowing.purpose}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Current Due Date Details */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                        <span className="text-sm font-medium text-gray-700">Current Due Date</span>
                      </div>
                      <div className="space-y-2 text-sm pl-4">
                        <div className="bg-white/60 p-3 rounded border">
                          <div className="font-medium text-gray-900 mb-1">
                            {new Date(borrowing.dueDate).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </div>
                          <div className="text-xs text-gray-600">
                            {new Date(borrowing.dueDate).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                        <div className={cn(
                          "text-xs p-2 rounded border",
                          new Date(borrowing.dueDate) < new Date()
                            ? "bg-red-50 text-red-700 border-red-200"
                            : "bg-green-50 text-green-700 border-green-200"
                        )}>
                          {new Date(borrowing.dueDate) < new Date()
                            ? `⚠️ Overdue by ${Math.ceil((new Date().getTime() - new Date(borrowing.dueDate).getTime()) / (1000 * 60 * 60 * 24))} days`
                            : `✅ Due in ${Math.ceil((new Date(borrowing.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days`
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Extension Options */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                  <div className="p-4 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900">Quick Extension Options</h3>
                    <p className="text-sm text-gray-600 mt-1">Choose a preset extension period or set custom date</p>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { days: 7, label: '+1 Week', color: 'blue' },
                        { days: 14, label: '+2 Weeks', color: 'green' },
                        { days: 30, label: '+1 Month', color: 'purple' },
                        { days: 60, label: '+2 Months', color: 'orange' }
                      ].map((option) => {
                        const newDate = new Date();
                        newDate.setDate(newDate.getDate() + option.days);
                        const isSelected = formData.newDueDate === newDate.toISOString().slice(0, 16);
                        return (
                          <Button
                            key={option.days}
                            type="button"
                            variant={isSelected ? "default" : "outline"}
                            size="sm"
                            onClick={() => {
                              setFormData((prev) => ({
                                ...prev,
                                newDueDate: newDate.toISOString().slice(0, 16)
                              }));
                            }}
                            className={cn(
                              "h-auto py-3 px-3 flex flex-col items-center space-y-1 transition-all duration-200",
                              !isSelected && "hover:bg-gray-50 hover:border-gray-300",
                              isSelected && "bg-blue-500 text-white border-blue-500"
                            )}
                          >
                            <span className="font-medium text-sm">{option.label}</span>
                            <span className="text-xs opacity-75">
                              {newDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Custom Date Selection */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                  <div className="p-4 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900">Custom Due Date</h3>
                    <p className="text-sm text-gray-600 mt-1">Set a specific date and time for the extension</p>
                  </div>
                  <div className="p-4 space-y-4">
                    <div>
                      <DateTimePicker
                        id="newDueDate"
                        label="New Due Date & Time"
                        value={formData.newDueDate || ''}
                        onChange={(value) => setFormData((prev) => ({
                          ...prev,
                          newDueDate: value
                        }))}
                        min={new Date().toISOString().slice(0, 16)}
                        required
                        placeholder="Select new due date and time"
                      />
                    </div>

                    {formData.newDueDate && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-start space-x-2">
                          <Calendar className="w-4 h-4 text-blue-600 mt-0.5" />
                          <div className="text-sm">
                            <div className="font-medium text-blue-900 mb-1">
                              📅 New due date: {new Date(formData.newDueDate).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                            <div className="text-blue-700">
                              ⏱️ Extension period: {Math.ceil((new Date(formData.newDueDate).getTime() - new Date(borrowing.dueDate).getTime()) / (1000 * 60 * 60 * 24))} days
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Reason with Templates */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                  <div className="p-4 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900">Reason for Extension</h3>
                    <p className="text-sm text-gray-600 mt-1">Provide a clear justification for the extension request</p>
                  </div>
                  <div className="p-4 space-y-4">
                    {/* Quick Reason Templates */}
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">Quick Templates</Label>
                      <div className="flex flex-wrap gap-2">
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
                            onClick={() => setFormData((prev) => ({ ...prev, reason: template }))}
                            className={cn(
                              "text-xs transition-all duration-200",
                              formData.reason === template
                                ? "bg-blue-100 border-blue-300 text-blue-700"
                                : "hover:bg-gray-50 hover:border-gray-300"
                            )}
                          >
                            {template}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="reason" className="text-sm font-medium text-gray-700">Detailed Reason</Label>
                      <Textarea
                        id="reason"
                        placeholder="Please provide a detailed reason for extending the due date..."
                        value={formData.reason || ''}
                        onChange={(e) => setFormData((prev) => ({ ...prev, reason: e.target.value }))}
                        className="mt-2 min-h-[80px]"
                        required
                      />
                      <div className="flex justify-between items-center mt-2">
                        <div className="text-xs text-gray-500">
                          {formData.reason?.length || 0}/500 characters
                        </div>
                        {formData.reason && formData.reason.length > 0 && (
                          <div className="text-xs text-green-600">✓ Reason provided</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced Action Buttons */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-5 border border-gray-200 shadow-sm">
              {/* Progress Indicator for Return */}
              {type === 'return' && borrowing && (
                <div className="mb-5">
                  <div className="flex items-center justify-between text-sm mb-3">
                    <div className="flex items-center space-x-2">
                      <Package className="w-4 h-4 text-gray-600" />
                      <span className="font-medium text-gray-700">Return Progress</span>
                    </div>
                    <span className="font-semibold text-gray-900">
                      {Object.keys(itemConditions).length} / {borrowing.items.length} items configured
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
                    <div
                      className="bg-gradient-to-r from-green-400 to-green-500 h-3 rounded-full transition-all duration-500 shadow-sm"
                      style={{
                        width: `${(Object.keys(itemConditions).length / borrowing.items.length) * 100}%`
                      }}
                    ></div>
                  </div>
                  {Object.keys(itemConditions).length < borrowing.items.length && (
                    <div className="flex items-center space-x-2 mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <p className="text-xs text-amber-700">
                        Please configure return conditions for all items before proceeding
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Progress Indicator for Extend */}
              {type === 'extend' && (
                <div className="mb-5">
                  <div className="flex items-center justify-between text-sm mb-3">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-600" />
                      <span className="font-medium text-gray-700">Extension Form</span>
                    </div>
                    <span className="font-semibold text-gray-900">
                      {(formData.newDueDate && formData.reason) ? 'Complete' : 'Incomplete'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
                    <div
                      className="bg-gradient-to-r from-blue-400 to-blue-500 h-3 rounded-full transition-all duration-500 shadow-sm"
                      style={{
                        width: `${((formData.newDueDate ? 50 : 0) + (formData.reason ? 50 : 0))}%`
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between mt-2 text-xs">
                    <span className={cn(
                      "flex items-center space-x-1",
                      formData.newDueDate ? "text-green-600" : "text-gray-500"
                    )}>
                      {formData.newDueDate ? <CheckCircle className="w-3 h-3" /> : <div className="w-3 h-3 border border-gray-300 rounded-full" />}
                      <span>Due Date Set</span>
                    </span>
                    <span className={cn(
                      "flex items-center space-x-1",
                      formData.reason ? "text-green-600" : "text-gray-500"
                    )}>
                      {formData.reason ? <CheckCircle className="w-3 h-3" /> : <div className="w-3 h-3 border border-gray-300 rounded-full" />}
                      <span>Reason Provided</span>
                    </span>
                  </div>
                </div>
              )}

              <div className="flex space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 hover:bg-white hover:shadow-sm transition-all duration-200"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className={cn(
                    "flex-1 transition-all duration-200 shadow-sm hover:shadow-md",
                    type === 'return'
                      ? "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                      : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
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
