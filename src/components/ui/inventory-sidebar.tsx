import React, { useState, useEffect } from 'react';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { Textarea } from './textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import { Badge } from './badge';
import { cn } from '@/lib/utils';
import {
  X,
  Plus,
  Minus,
  Package,
  Wrench,
  User,
  AlertTriangle,
  Info
} from 'lucide-react';

interface InventoryItem {
  id: string;
  name: string;
  type: 'tool' | 'material';
  category: string;
  quantity?: number;
  unit?: string;
  condition?: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  units?: Array<{
    id: string;
    unitNumber: number;
    condition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
    isAvailable: boolean;
    notes?: string;
  }>;
  available?: number;
  total?: number;
  threshold?: number;
  supplier?: string;
  location?: string;
}

interface SelectedItem extends InventoryItem {
  selectedQuantity?: number;
  categoryId?: string;
  totalQuantity?: number;
  availableQuantity?: number;
  currentQuantity?: number;
  thresholdQuantity?: number;
  stockStatus?: string;
  isLowStock?: boolean;
  borrowedQuantity?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface NewUnit {
  condition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  notes?: string;
}

interface NewItem {
  name: string;
  type: 'tool' | 'material';
  category: string;
  quantity: number;
  unit?: string;
  threshold?: number;
  location?: string;
  supplier?: string;
  // For tools: condition distribution
  conditionDistribution?: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
  defaultCondition?: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  useDefaultCondition?: boolean;
}

// Kategori sekarang berasal dari prop, bukan hardcoded

const conditions = [
  { value: 'EXCELLENT', label: 'Excellent' },
  { value: 'GOOD', label: 'Good' },
  { value: 'FAIR', label: 'Fair' },
  { value: 'POOR', label: 'Poor' }
];

interface SidebarFormProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'create' | 'edit' | 'process' | 'delete';
  selectedItems?: SelectedItem[];
  editItem?: InventoryItem;
  onSubmit: (formData: any) => void;
  toolCategories?: Array<{ id: string; name: string; type: string }>;
  materialCategories?: Array<{ id: string; name: string; type: string }>;
}

// Kategori sekarang berasal dari prop, bukan hardcoded

const units = [
  { value: 'kg', label: 'Kilograms (kg)' },
  { value: 'meter', label: 'Meters (m)' },
  { value: 'liters', label: 'Liters (L)' },
  { value: 'pieces', label: 'Pieces (pcs)' },
  { value: 'boxes', label: 'Boxes' }
];


export function InventorySidebar({ isOpen, onClose, type, selectedItems = [], editItem, onSubmit, toolCategories = [], materialCategories = [] }: SidebarFormProps) {
  const [formData, setFormData] = useState<any>({});
  const [newItems, setNewItems] = useState<NewItem[]>([
    {
      name: '',
      type: 'tool',
      category: toolCategories[0]?.id || '',
      quantity: 1,
      location: '',
      supplier: '',
      defaultCondition: 'GOOD',
      useDefaultCondition: true,
      conditionDistribution: {
        excellent: 0,
        good: 1,
        fair: 0,
        poor: 0
      }
    }
  ]);
  const [processType, setProcessType] = useState<'borrow' | 'consume'>('borrow');
  const [borrowForm, setBorrowForm] = useState({
    borrowerName: '',
    dueDate: '',
    purpose: '',
    notes: ''
  });
  const [consumeForm, setConsumeForm] = useState({
    consumerName: '',
    purpose: '',
    projectName: '',
    notes: ''
  });
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});
  const [selectedUnits, setSelectedUnits] = useState<Record<string, string[]>>({});

  // Check if selected items contain both tools and materials
  const hasTools = selectedItems.some(item => item.type === 'tool');
  const hasMaterials = selectedItems.some(item => item.type === 'material');
  const hasMixed = hasTools && hasMaterials;

  // Set process type based on selected items
  useEffect(() => {
    if (!hasMixed) {
      if (hasTools) {
        setProcessType('borrow');
      } else if (hasMaterials) {
        setProcessType('consume');
      }
    }
  }, [hasTools, hasMaterials, hasMixed]);

  // Filter items by type for process form
  const selectedTools = selectedItems.filter(item => item.type === 'tool');
  const selectedMaterials = selectedItems.filter(item => item.type === 'material');

  const validateMaterialQuantities = () => {
  const invalidItems = selectedItems
    .filter(item => item.type === 'material')
    .filter(item => {
      const requestedQty = itemQuantities[item.id] || 0.001;
      const availableQty = item.quantity || 0;
      return requestedQty > availableQty;
    });

  if (invalidItems.length > 0) {
    const itemList = invalidItems
      .map(item => `${item.name} (Requested: ${itemQuantities[item.id]}, Available: ${item.quantity})`)
      .join(', ');
    throw new Error(`Insufficient stock for: ${itemList}`);
  }
};

  useEffect(() => {
    if (type === 'edit' && editItem) {
      setFormData({
        name: editItem.name,
        category: editItem.category,
        location: editItem.location || '',
        supplier: editItem.supplier || '',
        ...(editItem.type === 'tool'
          ? {
              quantity: editItem.total || editItem.totalQuantity || 1,
            }
          : {
              quantity: editItem.quantity || 0,
              unit: editItem.unit || 'pieces',
              threshold: editItem.threshold || 10,
            })
      });
    } else {
      setFormData({});
    }
  }, [type, editItem, isOpen]);

  // Initialize item quantities when items are selected
  useEffect(() => {
    if (selectedItems.length > 0) {
      const initialQuantities: Record<string, number> = {};
      selectedItems.forEach(item => {
        initialQuantities[item.id] = item.type === 'tool' ? 1 : 0.001;
      });
      setItemQuantities(initialQuantities);
    }
  }, [selectedItems]);

  // Reset form data when sidebar closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({});
      setBorrowForm({
        borrowerName: '',
        dueDate: '',
        purpose: '',
        notes: ''
      });
      setConsumeForm({
        consumerName: '',
        purpose: '',
        projectName: '',
        notes: ''
      });
      setItemQuantities({});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', { type, borrowForm, consumeForm, itemQuantities });

    try {
      switch (type) {
      case 'create':
        // Validate create items
        const invalidItems = newItems.filter(item => {
          if (!item.name.trim()) return true;
          if (!item.category) return true;
          if (item.quantity <= 0) return true;

          // For tools, validate condition distribution
          if (item.type === 'tool' && !item.useDefaultCondition) {
            const totalDistribution = Object.values(item.conditionDistribution || {}).reduce((sum, count) => sum + count, 0);
            if (totalDistribution !== item.quantity) return true;
          }

          return false;
        });

        if (invalidItems.length > 0) {
          throw new Error('Please fill all required fields and ensure condition distribution matches quantity');
        }

        onSubmit({ items: newItems });
        break;
      case 'edit':
        const editPayload = editItem?.type === 'tool'
          ? {
              id: editItem.id,
              name: formData.name,
              categoryId: formData.category,
              location: formData.location,
              supplier: formData.supplier,
              totalQuantity: formData.quantity
            }
          : {
              id: editItem?.id,
              name: formData.name,
              categoryId: formData.category,
              location: formData.location,
              supplier: formData.supplier,
              currentQuantity: formData.quantity,
              thresholdQuantity: formData.threshold,
              unit: formData.unit
            };
        onSubmit(editPayload);
        break;
      case 'process':
        if (processType === 'borrow' && (hasMixed || hasTools)) {
          // Validate required fields for borrowing
          if (!borrowForm.borrowerName || !borrowForm.dueDate || !borrowForm.purpose) {
            throw new Error('Please fill all required fields for borrowing');
          }

          const dueDate = new Date(borrowForm.dueDate);
          if (isNaN(dueDate.getTime())) {
            throw new Error('Invalid due date');
          }

          // Validate unit selection
          const toolsWithoutUnits = selectedItems
            .filter(item => item.type === 'tool')
            .filter(tool => !selectedUnits[tool.id] || selectedUnits[tool.id].length === 0);

          if (toolsWithoutUnits.length > 0) {
            const toolNames = toolsWithoutUnits.map(t => t.name).join(', ');
            throw new Error(`Please select at least one unit for: ${toolNames}`);
          }

          const borrowPayload = {
            type: 'borrow',
            borrowerName: borrowForm.borrowerName,
            dueDate: dueDate.toISOString(),
            purpose: borrowForm.purpose,
            notes: borrowForm.notes,
            items: selectedItems
              .filter(item => item.type === 'tool')
              .map(tool => ({
                toolId: tool.id,
                units: selectedUnits[tool.id] || [],
                notes: borrowForm.notes
              }))
          };
          onSubmit(borrowPayload);
        } else {
          // Validate required fields for consuming
          if (!consumeForm.consumerName || !consumeForm.purpose) {
            throw new Error('Please fill all required fields for consumption');
          }
          // Validate material quantities
          validateMaterialQuantities();
          const consumePayload = {
            type: 'consume',
            consumerName: consumeForm.consumerName,
            purpose: consumeForm.purpose,
            projectName: consumeForm.projectName || undefined, // Make undefined if empty
            notes: consumeForm.notes || undefined, // Make undefined if empty
            items: selectedItems
              .filter(item => item.type === 'material')
              .map(material => ({
                materialId: material.id,
                quantity: Math.max(0.001, itemQuantities[material.id] || 0.001)
              }))
          };
          onSubmit(consumePayload);
}
        break;
      case 'delete':
        onSubmit({ items: selectedItems });
        break;
      }

      onClose();
    } catch (error) {
      console.error('Form submission error:', error);
      alert(error instanceof Error ? error.message : 'An error occurred while processing the form');
    }
  };

  const addNewItem = () => {
    setNewItems(prev => [
      ...prev,
      {
        name: '',
        type: 'tool',
        category: toolCategories[0]?.id || '',
        quantity: 1,
        location: '',
        supplier: '',
        defaultCondition: 'GOOD',
        useDefaultCondition: true,
        conditionDistribution: {
          excellent: 0,
          good: 1,
          fair: 0,
          poor: 0
        }
      }
    ]);
  };

  const removeNewItem = (index: number) => {
    if (newItems.length > 1) {
      setNewItems(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateConditionDistribution = (index: number, condition: keyof NewItem['conditionDistribution'], value: number) => {
    setNewItems(prev => prev.map((item, i) => {
      if (i !== index || !item.conditionDistribution) return item;

      const newDistribution = {
        ...item.conditionDistribution,
        [condition]: Math.max(0, value)
      };

      // Calculate total
      const total = Object.values(newDistribution).reduce((sum, count) => sum + count, 0);

      // Update quantity to match total distribution
      return {
        ...item,
        conditionDistribution: newDistribution,
        quantity: total
      };
    }));
  };

  const updateNewItem = (index: number, field: string, value: any) => {
    setNewItems(prev => prev.map((item, i) => {
      if (i !== index) return item;

      if (field === 'type') {
        // Reset item for new type
        return {
          ...item,
          type: value,
          category: value === 'tool' ? (toolCategories[0]?.id || '') : (materialCategories[0]?.id || ''),
          defaultCondition: value === 'tool' ? 'GOOD' : undefined,
          useDefaultCondition: value === 'tool' ? true : undefined,
          conditionDistribution: value === 'tool' ? {
            excellent: 0,
            good: 1,
            fair: 0,
            poor: 0
          } : undefined
        };
      }

      if (field === 'quantity' && item.type === 'tool') {
        const newQuantity = parseInt(value) || 1;

        if (item.useDefaultCondition) {
          // If using default condition, update the distribution accordingly
          const updatedDistribution = {
            excellent: 0,
            good: 0,
            fair: 0,
            poor: 0
          };

          const conditionKey = item.defaultCondition?.toLowerCase() as keyof typeof updatedDistribution;
          if (conditionKey) {
            updatedDistribution[conditionKey] = newQuantity;
          }

          return {
            ...item,
            quantity: newQuantity,
            conditionDistribution: updatedDistribution
          };
        } else {
          // If using custom distribution, maintain the distribution but adjust if total exceeds new quantity
          const currentTotal = Object.values(item.conditionDistribution || {}).reduce((sum, count) => sum + count, 0);
          if (currentTotal > newQuantity) {
            // Proportionally reduce the distribution
            const ratio = newQuantity / currentTotal;
            const adjustedDistribution = {
              excellent: Math.floor((item.conditionDistribution?.excellent || 0) * ratio),
              good: Math.floor((item.conditionDistribution?.good || 0) * ratio),
              fair: Math.floor((item.conditionDistribution?.fair || 0) * ratio),
              poor: Math.floor((item.conditionDistribution?.poor || 0) * ratio)
            };

            // Adjust for rounding errors
            const adjustedTotal = Object.values(adjustedDistribution).reduce((sum, count) => sum + count, 0);
            if (adjustedTotal < newQuantity) {
              adjustedDistribution.good += (newQuantity - adjustedTotal);
            }

            return {
              ...item,
              quantity: newQuantity,
              conditionDistribution: adjustedDistribution
            };
          }
        }
      }

      return { ...item, [field]: value };
    }));
  };

  const getTitle = () => {
    switch (type) {
      case 'create': return 'Create Items';
      case 'edit': return 'Edit Item';
      case 'process': return 'Process Transaction';
      case 'delete': return 'Delete Items';
      default: return 'Form';
    }
  };

  const updateUnitCondition = (itemIndex: number, unitIndex: number, condition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR') => {
    setNewItems(prev => prev.map((item, i) => {
      if (i !== itemIndex) return item;
      const updatedUnits = [...(item.units || [])];
      updatedUnits[unitIndex] = { ...updatedUnits[unitIndex], condition };
      return { ...item, units: updatedUnits };
    }));
  };

  const updateUnitNote = (itemIndex: number, unitIndex: number, notes: string) => {
    setNewItems(prev => prev.map((item, i) => {
      if (i !== itemIndex) return item;
      const updatedUnits = [...(item.units || [])];
      updatedUnits[unitIndex] = { ...updatedUnits[unitIndex], notes };
      return { ...item, units: updatedUnits };
    }));
  };

  const renderCreateForm = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Add multiple tools and/or materials in one transaction
        </p>
        <Button type="button" size="sm" onClick={addNewItem}>
          <Plus className="w-4 h-4 mr-1" />
          Add Item
        </Button>
      </div>

  {newItems.map((item: NewItem, index: number) => (
        <div key={index} className="p-4 border rounded-lg bg-gray-50/50 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Item {index + 1}</h4>
            {newItems.length > 1 && (
              <Button type="button" size="sm" variant="outline" onClick={() => removeNewItem(index)}>
                <Minus className="w-4 h-4" />
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Nama Item</Label>
              <Input
                value={item.name}
                onChange={(e) => updateNewItem(index, 'name', e.target.value)}
                placeholder="Masukkan nama item"
                required
              />
            </div>

            <div>
              <Label>Tipe</Label>
              <Select value={item.type} onValueChange={(value) => updateNewItem(index, 'type', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tool">Alat</SelectItem>
                  <SelectItem value="material">Material</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Kategori</Label>
              <Select value={item.category} onValueChange={(value) => updateNewItem(index, 'category', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {(item.type === 'tool' ? toolCategories : materialCategories).map((cat: { id: string; name: string; type: string }) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Jumlah</Label>
              <Input
                type="number"
                value={item.quantity}
                onChange={(e) => updateNewItem(index, 'quantity', parseInt(e.target.value) || 1)}
                min="1"
                required
              />
            </div>

            <div>
              <Label>Lokasi</Label>
              <Input
                value={item.location || ''}
                onChange={(e) => updateNewItem(index, 'location', e.target.value)}
                placeholder="Gudang, Rak, dll"
              />
            </div>

            <div>
              <Label>Supplier</Label>
              <Input
                value={item.supplier || ''}
                onChange={(e) => updateNewItem(index, 'supplier', e.target.value)}
                placeholder="Nama supplier (opsional)"
              />
            </div>

            {item.type === 'tool' && (
              <div className="col-span-2">
                <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <h5 className="font-medium text-blue-900">Condition Distribution</h5>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`use-default-${index}`}
                        checked={item.useDefaultCondition}
                        onChange={(e) => updateNewItem(index, 'useDefaultCondition', e.target.checked)}
                        className="h-4 w-4"
                      />
                      <Label htmlFor={`use-default-${index}`} className="text-sm text-blue-800">
                        Use default condition for all units
                      </Label>
                    </div>
                  </div>

                  {item.useDefaultCondition ? (
                    <div>
                      <Label className="text-blue-800">Default Condition for All {item.quantity} Units</Label>
                      <Select
                        value={item.defaultCondition}
                        onValueChange={(value) => {
                          updateNewItem(index, 'defaultCondition', value);
                          // Update distribution when default condition changes
                          const updatedDistribution = {
                            excellent: 0,
                            good: 0,
                            fair: 0,
                            poor: 0
                          };
                          const conditionKey = value.toLowerCase() as keyof typeof updatedDistribution;
                          updatedDistribution[conditionKey] = item.quantity;
                          updateNewItem(index, 'conditionDistribution', updatedDistribution);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {conditions.map((cond) => (
                            <SelectItem key={cond.value} value={cond.value}>{cond.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Label className="text-blue-800">Custom Condition Distribution</Label>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { key: 'excellent', label: 'Excellent', color: 'text-green-700', bgColor: 'bg-green-50' },
                          { key: 'good', label: 'Good', color: 'text-blue-700', bgColor: 'bg-blue-50' },
                          { key: 'fair', label: 'Fair', color: 'text-yellow-700', bgColor: 'bg-yellow-50' },
                          { key: 'poor', label: 'Poor', color: 'text-red-700', bgColor: 'bg-red-50' }
                        ].map(({ key, label, color, bgColor }) => (
                          <div key={key} className={`p-2 rounded border ${bgColor}`}>
                            <Label className={`text-xs font-medium ${color}`}>{label}</Label>
                            <Input
                              type="number"
                              min="0"
                              value={item.conditionDistribution?.[key as keyof typeof item.conditionDistribution] || 0}
                              onChange={(e) => updateConditionDistribution(
                                index,
                                key as keyof NewItem['conditionDistribution'],
                                parseInt(e.target.value) || 0
                              )}
                              className="mt-1 h-8 text-sm"
                            />
                          </div>
                        ))}
                      </div>

                      {/* Distribution Summary */}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-blue-700">Total Units:</span>
                        <span className="font-semibold text-blue-900">
                          {Object.values(item.conditionDistribution || {}).reduce((sum, count) => sum + count, 0)}
                        </span>
                      </div>

                      {/* Warning if total doesn't match quantity */}
                      {Object.values(item.conditionDistribution || {}).reduce((sum, count) => sum + count, 0) !== item.quantity && (
                        <div className="flex items-center space-x-2 text-amber-700 bg-amber-50 p-2 rounded text-xs">
                          <AlertTriangle className="w-4 h-4" />
                          <span>Total distribution should equal quantity ({item.quantity})</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {item.type === 'material' && (
              <>
                <div>
                  <Label>Unit</Label>
                  <Select value={item.unit} onValueChange={(value) => updateNewItem(index, 'unit', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((unit) => (
                        <SelectItem key={unit.value} value={unit.value}>{unit.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Low Stock Threshold</Label>
                  <Input
                    type="number"
                    value={item.threshold || 10}
                    onChange={(e) => updateNewItem(index, 'threshold', parseInt(e.target.value) || 10)}
                    min="1"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  const renderEditForm = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="name">Nama Item</Label>
        <Input
          id="name"
          value={formData.name || ''}
          onChange={(e) => setFormData((prev: any) => ({ ...prev, name: e.target.value }))}
          required
        />
      </div>

      <div>
        <Label htmlFor="category">Kategori</Label>
        <Select value={formData.category} onValueChange={(value) => setFormData((prev: any) => ({ ...prev, category: value }))}>
          <SelectTrigger>
            <SelectValue placeholder="Pilih kategori" />
          </SelectTrigger>
          <SelectContent>
            {(editItem?.type === 'tool' ? toolCategories : materialCategories).map((cat: { id: string; name: string; type: string }) => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="quantity">Jumlah</Label>
          <Input
            id="quantity"
            type="number"
            value={formData.quantity || 1}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
            min="1"
            required
          />
        </div>

        {editItem?.type === 'material' && (
          <div>
            <Label htmlFor="unit">Unit</Label>
            <Select value={formData.unit} onValueChange={(value) => setFormData((prev: any) => ({ ...prev, unit: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {units.map((unit) => (
                  <SelectItem key={unit.value} value={unit.value}>{unit.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Note: Tool condition is now managed per unit, not per tool */}
      </div>

      <div>
        <Label htmlFor="location">Lokasi</Label>
        <Input
          id="location"
          value={formData.location || ''}
          onChange={(e) => setFormData((prev: any) => ({ ...prev, location: e.target.value }))}
          placeholder="Gudang, Rak, dll"
        />
      </div>

      <div>
        <Label htmlFor="supplier">Supplier</Label>
        <Input
          id="supplier"
          value={formData.supplier || ''}
          onChange={(e) => setFormData((prev: any) => ({ ...prev, supplier: e.target.value }))}
          placeholder="Nama supplier (opsional)"
        />
      </div>

      {editItem?.type === 'material' && (
        <div>
          <Label htmlFor="threshold">Low Stock Threshold</Label>
          <Input
            id="threshold"
            type="number"
            value={formData.threshold || 10}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, threshold: parseInt(e.target.value) || 10 }))}
            min="1"
          />
        </div>
      )}
    </div>
  );

  const renderBorrowForm = (items: SelectedItem[]) => {
    console.log('Rendering borrow form with items:', items);
    console.log('Items with units:', items.map(item => ({ id: item.id, name: item.name, units: item.units })));

    return (
      <div className="space-y-4">
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-medium text-blue-900 mb-2">Borrowing Transaction</h4>
          <p className="text-sm text-blue-700">
            Processing {items.length} tool(s) for borrowing
          </p>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Borrower Name</Label>
          <Input
            value={borrowForm.borrowerName}
            onChange={(e) => setBorrowForm(prev => ({ ...prev, borrowerName: e.target.value }))}
            placeholder="Enter borrower name"
            required
          />
        </div>

        <div>
          <Label>Due Date</Label>
          <Input
            type="datetime-local"
            value={borrowForm.dueDate}
            onChange={(e) => setBorrowForm(prev => ({ ...prev, dueDate: e.target.value }))}
            min={new Date().toISOString().slice(0, 16)}
            required
          />
        </div>
      </div>

      <div>
        <Label>Purpose</Label>
        <Textarea
          value={borrowForm.purpose}
          onChange={(e) => setBorrowForm(prev => ({ ...prev, purpose: e.target.value }))}
          placeholder="Describe the purpose of borrowing these tools..."
          required
        />
      </div>

      <div>
        <Label>Additional Notes</Label>
        <Textarea
          value={borrowForm.notes || ''}
          onChange={(e) => setBorrowForm(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Any additional notes..."
        />
      </div>

      <div className="space-y-3">
        <Label>Tools to Borrow</Label>
        {items.map((item) => {
          const availableUnits = item.units?.filter(u => u.isAvailable) || [];
          const selectedCount = selectedUnits[item.id]?.length || 0;

          return (
            <div key={item.id} className="p-4 border rounded-lg bg-white shadow-sm">
              <div className="space-y-3">
                {/* Tool Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{item.name}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>Available: {availableUnits.length} units</span>
                      <span>Selected: {selectedCount} units</span>
                    </div>
                  </div>
                  <Badge variant={selectedCount > 0 ? "default" : "secondary"}>
                    {selectedCount > 0 ? `${selectedCount} selected` : 'None selected'}
                  </Badge>
                </div>

                {/* Unit Selection */}
                {availableUnits.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-gray-700">Select Units:</Label>
                      <div className="flex space-x-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            // Select all available units
                            setSelectedUnits(prev => ({
                              ...prev,
                              [item.id]: availableUnits.map(u => u.id)
                            }));
                          }}
                          className="text-xs h-6 px-2"
                        >
                          Select All
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            // Clear selection
                            setSelectedUnits(prev => ({
                              ...prev,
                              [item.id]: []
                            }));
                          }}
                          className="text-xs h-6 px-2"
                        >
                          Clear
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                      {availableUnits.map((unit) => (
                        <div
                          key={unit.id}
                          className={cn(
                            "flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-all",
                            selectedUnits[item.id]?.includes(unit.id)
                              ? "bg-blue-50 border-blue-200 shadow-sm"
                              : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                          )}
                          onClick={() => {
                            setSelectedUnits(prev => ({
                              ...prev,
                              [item.id]: prev[item.id]?.includes(unit.id)
                                ? prev[item.id].filter(id => id !== unit.id)
                                : [...(prev[item.id] || []), unit.id]
                            }));
                          }}
                        >
                          <input
                            type="checkbox"
                            id={`unit-${unit.id}`}
                            checked={selectedUnits[item.id]?.includes(unit.id) || false}
                            onChange={() => {}} // Handled by div onClick
                            className="h-4 w-4 text-blue-600 rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <Label htmlFor={`unit-${unit.id}`} className="text-sm font-medium text-gray-900 cursor-pointer">
                                Unit #{unit.unitNumber}
                              </Label>
                              <Badge
                                className={cn(
                                  "text-xs",
                                  unit.condition === 'EXCELLENT' ? "bg-green-100 text-green-800" :
                                  unit.condition === 'GOOD' ? "bg-blue-100 text-blue-800" :
                                  unit.condition === 'FAIR' ? "bg-yellow-100 text-yellow-800" :
                                  "bg-red-100 text-red-800"
                                )}
                              >
                                {unit.condition}
                              </Badge>
                            </div>
                            {unit.notes && (
                              <p className="text-xs text-gray-500 mt-1 truncate">
                                {unit.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No units available for borrowing</p>
                  </div>
                )}

                {/* Selection Summary */}
                {selectedCount > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-blue-700 font-medium">
                        {selectedCount} unit{selectedCount > 1 ? 's' : ''} selected for borrowing
                      </span>
                      <span className="text-blue-600">
                        {availableUnits.filter(u => selectedUnits[item.id]?.includes(u.id))
                          .map(u => `#${u.unitNumber}`)
                          .join(', ')}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

  const renderConsumeForm = (items: SelectedItem[]) => {
    console.log('Rendering consume form with items:', items);
    console.log('Items with quantities:', items.map(item => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      currentQuantity: item.currentQuantity,
      available: item.available,
      unit: item.unit
    })));

    return (
      <div className="space-y-4">
        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
          <h4 className="font-medium text-purple-900 mb-2">Consumption Transaction</h4>
          <p className="text-sm text-purple-700">
            Processing {items.length} material(s) for consumption
          </p>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="consume-consumer-name">Consumer Name</Label>
          <Input
            id="consume-consumer-name"
            name="consume-consumer-name"
            value={consumeForm.consumerName}
            onChange={(e) => setConsumeForm(prev => ({ ...prev, consumerName: e.target.value }))}
            placeholder="Enter consumer name"
            required
          />
        </div>

        <div>
          <Label htmlFor="consume-project-name">Project Name</Label>
          <Input
            id="consume-project-name"
            name="consume-project-name"
            value={consumeForm.projectName}
            onChange={(e) => setConsumeForm(prev => ({ ...prev, projectName: e.target.value }))}
            placeholder="Optional project name"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="consume-purpose">Purpose</Label>
        <Textarea
          id="consume-purpose"
          name="consume-purpose"
          value={consumeForm.purpose}
          onChange={(e) => setConsumeForm(prev => ({ ...prev, purpose: e.target.value }))}
          placeholder="Describe the purpose of consuming these materials..."
          required
        />
      </div>

      <div>
        <Label htmlFor="consume-notes">Additional Notes</Label>
        <Textarea
          id="consume-notes"
          name="consume-notes"
          value={consumeForm.notes}
          onChange={(e) => setConsumeForm(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Any additional notes..."
        />
      </div>

      <div className="space-y-3">
        <Label>Materials to Consume</Label>
        {items.map((item) => (
          <div key={item.id} className="p-3 border rounded-lg bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-muted-foreground">
                  Available: {item.quantity || item.currentQuantity || item.available || 0} {item.unit}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor={`consume-quantity-${item.id}`}>Quantity:</Label>
                <Input
                  id={`consume-quantity-${item.id}`}
                  name={`consume-quantity-${item.id}`}
                  type="number"
                  value={itemQuantities[item.id] || 0.001}
                  onChange={(e) => {
                    console.log('Consume quantity onChange triggered');
                    console.log('Current value:', e.target.value);
                    console.log('Current itemQuantities:', itemQuantities);
                    const value = parseFloat(e.target.value) || 0.001;
                    console.log('Calculated value:', value);
                    const maxQuantity = item.quantity || item.currentQuantity || item.available || 0;
                    setItemQuantities(prev => ({
                      ...prev,
                      [item.id]: Number(Math.max(0.001, Math.min(value, maxQuantity)).toFixed(3))
                    }));
                  }}
                  onFocus={(e) => e.target.select()}
                  min="0.001"
                  max={item.quantity || item.currentQuantity || item.available || 0}
                  step="0.001"
                  className="w-20"
                  required
                />
                <span className="text-sm text-muted-foreground">{item.unit}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

  const renderProcessForm = () => {
    if (hasMixed) {
      return (
        <Tabs value={processType} onValueChange={(value: any) => setProcessType(value)} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="borrow" disabled={!hasTools}>
              <Wrench className="w-4 h-4 mr-2" />
              Borrow Tools ({selectedTools.length})
            </TabsTrigger>
            <TabsTrigger value="consume" disabled={!hasMaterials}>
              <Package className="w-4 h-4 mr-2" />
              Consume Materials ({selectedMaterials.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="borrow" className="space-y-4">
            {renderBorrowForm(selectedTools)}
          </TabsContent>

          <TabsContent value="consume" className="space-y-4">
            {renderConsumeForm(selectedMaterials)}
          </TabsContent>
        </Tabs>
      );
    } else if (hasTools) {
      return renderBorrowForm(selectedTools);
    } else {
      return renderConsumeForm(selectedMaterials);
    }
  };





  const renderDeleteForm = () => (
    <div className="space-y-4">
      <div className="p-4 bg-red-50 rounded-lg border border-red-200">
        <div className="flex items-center space-x-2 mb-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <h4 className="font-medium text-red-900">Delete Confirmation</h4>
        </div>
        <p className="text-sm text-red-700">
          You are about to delete {selectedItems.length} item(s). This action cannot be undone.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Items to Delete:</Label>
        {selectedItems.map((item) => (
          <div key={item.id} className="p-3 border rounded-lg bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-muted-foreground">
                  ID: {item.id} | Type: {item.type}
                </p>
              </div>
              <Badge variant={item.type === 'tool' ? 'default' : 'secondary'}>
                {item.type}
              </Badge>
            </div>
          </div>
        ))}
      </div>

      {/* Check for active borrowings - this would need real data */}
      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <div className="flex items-center space-x-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-yellow-600" />
          <span className="font-medium text-yellow-900">Warning</span>
        </div>
        <p className="text-sm text-yellow-700">
          Some tools may have active borrowings. Items with active borrowings cannot be deleted.
        </p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="ml-auto w-full max-w-2xl glass border-l border-white/20 h-full overflow-y-auto transition-all-smooth">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              {type === 'create' && <Plus className="w-5 h-5 text-primary" />}
              {type === 'edit' && <Package className="w-5 h-5 text-primary" />}
              {type === 'process' && <User className="w-5 h-5 text-primary" />}
              {type === 'delete' && <AlertTriangle className="w-5 h-5 text-red-600" />}
              <h2 className="text-xl font-semibold">{getTitle()}</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {type === 'create' && renderCreateForm()}
            {type === 'edit' && renderEditForm()}
            {type === 'process' && renderProcessForm()}
            {type === 'delete' && renderDeleteForm()}

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4 border-t border-gray-200">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button
                type="submit"
                className={cn(
                  "flex-1",
                  type === 'delete' && "bg-red-600 hover:bg-red-700"
                )}
              >
                {type === 'create' && 'Create Items'}
                {type === 'edit' && 'Save Changes'}
                {type === 'process' && `Process ${processType}`}
                {type === 'delete' && 'Delete Items'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
