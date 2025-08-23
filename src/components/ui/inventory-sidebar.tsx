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
  const [borrowQuantities, setBorrowQuantities] = useState<Record<string, number>>({});
  const [selectionMode, setSelectionMode] = useState<Record<string, 'manual' | 'quantity'>>({});

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
      const initialSelectionModes: Record<string, 'manual' | 'quantity'> = {};
      const initialBorrowQuantities: Record<string, number> = {};

      selectedItems.forEach(item => {
        initialQuantities[item.id] = item.type === 'tool' ? 1 : 0.001;

        // Initialize selection mode for tools
        if (item.type === 'tool') {
          const availableUnits = item.units?.filter(u => u.isAvailable) || [];
          // Use smart mode for tools with many units, manual for few units
          initialSelectionModes[item.id] = availableUnits.length > 10 ? 'quantity' : 'manual';
          initialBorrowQuantities[item.id] = Math.min(1, availableUnits.length);
        }
      });

      setItemQuantities(initialQuantities);
      setSelectionMode(initialSelectionModes);
      setBorrowQuantities(initialBorrowQuantities);
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
      setBorrowQuantities({});
      setSelectionMode({});
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
          console.log('Processing borrow transaction...');
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

          // Validate borrow quantities for smart mode
          const toolsWithInvalidQuantities = selectedItems
            .filter(item => item.type === 'tool')
            .filter(tool => {
              const mode = selectionMode[tool.id];
              const borrowQty = borrowQuantities[tool.id];
              const selectedCount = selectedUnits[tool.id]?.length || 0;
              return mode === 'quantity' && borrowQty > 0 && selectedCount !== borrowQty;
            });

          if (toolsWithInvalidQuantities.length > 0) {
            const toolNames = toolsWithInvalidQuantities.map(t => t.name).join(', ');
            throw new Error(`Quantity mismatch for: ${toolNames}. Please check your selection.`);
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
        } else if (processType === 'consume' && (hasMixed || hasMaterials)) {
          console.log('Processing consume transaction...');
          // Validate required fields for consuming
          if (!consumeForm.consumerName || !consumeForm.purpose) {
            throw new Error('Please fill all required fields for consumption');
          }

          // Enhanced material quantity validation
          const materialsWithZeroQuantity = selectedItems
            .filter(item => item.type === 'material')
            .filter(material => !itemQuantities[material.id] || itemQuantities[material.id] <= 0);

          if (materialsWithZeroQuantity.length > 0) {
            const materialNames = materialsWithZeroQuantity.map(m => m.name).join(', ');
            throw new Error(`Please specify consumption quantity for: ${materialNames}`);
          }

          // Validate material quantities
          validateMaterialQuantities();

          const consumePayload = {
            type: 'consume',
            consumerName: consumeForm.consumerName,
            purpose: consumeForm.purpose,
            projectName: consumeForm.projectName || undefined,
            notes: consumeForm.notes || undefined,
            items: selectedItems
              .filter(item => item.type === 'material')
              .map(material => ({
                materialId: material.id,
                quantity: Math.max(0.001, itemQuantities[material.id] || 0.001)
              }))
          };
          onSubmit(consumePayload);
        } else if (hasMixed) {
          // Handle mixed process - this shouldn't happen with current UI but adding for safety
          throw new Error('Mixed process requires selecting either borrow or consume tab first');
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

  // Smart unit selection functions
  const selectUnitsByQuantity = (toolId: string, quantity: number, availableUnits: any[], preferredCondition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' = 'EXCELLENT') => {
    // Sort units by condition preference (excellent first, then good, etc.)
    const conditionPriority = { 'EXCELLENT': 4, 'GOOD': 3, 'FAIR': 2, 'POOR': 1 };
    const sortedUnits = [...availableUnits].sort((a, b) => {
      const aPriority = conditionPriority[a.condition as keyof typeof conditionPriority] || 0;
      const bPriority = conditionPriority[b.condition as keyof typeof conditionPriority] || 0;
      return bPriority - aPriority; // Descending order (best condition first)
    });

    // Select the requested quantity of units
    const selectedUnitIds = sortedUnits.slice(0, quantity).map(unit => unit.id);

    setSelectedUnits(prev => ({
      ...prev,
      [toolId]: selectedUnitIds
    }));
  };

  const selectUnitsByCondition = (toolId: string, condition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR', availableUnits: any[]) => {
    const unitsWithCondition = availableUnits.filter(unit => unit.condition === condition);
    const selectedUnitIds = unitsWithCondition.map(unit => unit.id);

    setSelectedUnits(prev => ({
      ...prev,
      [toolId]: selectedUnitIds
    }));
  };

  const toggleSelectionMode = (toolId: string, mode: 'manual' | 'quantity') => {
    setSelectionMode(prev => ({
      ...prev,
      [toolId]: mode
    }));

    // Clear selection when switching modes
    setSelectedUnits(prev => ({
      ...prev,
      [toolId]: []
    }));

    // Reset quantity when switching to manual
    if (mode === 'manual') {
      setBorrowQuantities(prev => ({
        ...prev,
        [toolId]: 0
      }));
    }
  };

  const updateBorrowQuantity = (toolId: string, quantity: number, availableUnits: any[]) => {
    setBorrowQuantities(prev => ({
      ...prev,
      [toolId]: quantity
    }));

    // Auto-select units based on quantity
    if (quantity > 0) {
      selectUnitsByQuantity(toolId, quantity, availableUnits);
    } else {
      setSelectedUnits(prev => ({
        ...prev,
        [toolId]: []
      }));
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
              <div className="col-span-2">
                <div className="space-y-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <h5 className="font-medium text-purple-900">Material Configuration</h5>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Unit of Measurement</Label>
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
                      <div className="flex space-x-2">
                        <Input
                          type="number"
                          value={item.threshold || 10}
                          onChange={(e) => updateNewItem(index, 'threshold', parseInt(e.target.value) || 10)}
                          min="1"
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            // Smart threshold suggestion based on quantity
                            const suggestedThreshold = Math.max(1, Math.floor(item.quantity * 0.1));
                            updateNewItem(index, 'threshold', suggestedThreshold);
                          }}
                          className="px-2"
                          title="Set to 10% of quantity"
                        >
                          Auto
                        </Button>
                      </div>
                      <p className="text-xs text-purple-600 mt-1">
                        Suggested: {Math.max(1, Math.floor(item.quantity * 0.1))} ({Math.floor(item.quantity * 0.1 / item.quantity * 100)}% of quantity)
                      </p>
                    </div>
                  </div>

                  {/* Smart Unit Suggestions based on category */}
                  <div className="space-y-2">
                    <Label className="text-sm text-purple-800">Smart Unit Suggestions:</Label>
                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        // Get category-specific suggestions
                        const categoryName = materialCategories.find(cat => cat.id === item.category)?.name?.toLowerCase() || '';
                        let suggestions = [
                          { unit: 'pieces', label: 'Pieces', icon: '📦', category: 'default' },
                          { unit: 'kg', label: 'Kilograms', icon: '⚖️', category: 'weight' },
                          { unit: 'meter', label: 'Meters', icon: '📏', category: 'length' },
                          { unit: 'liters', label: 'Liters', icon: '🪣', category: 'volume' },
                          { unit: 'boxes', label: 'Boxes', icon: '📦', category: 'container' }
                        ];

                        // Smart suggestions based on category
                        if (categoryName.includes('liquid') || categoryName.includes('chemical')) {
                          suggestions = [
                            { unit: 'liters', label: 'Liters', icon: '🪣', category: 'volume' },
                            { unit: 'kg', label: 'Kilograms', icon: '⚖️', category: 'weight' },
                            ...suggestions.filter(s => !['liters', 'kg'].includes(s.unit))
                          ];
                        } else if (categoryName.includes('cable') || categoryName.includes('wire')) {
                          suggestions = [
                            { unit: 'meter', label: 'Meters', icon: '📏', category: 'length' },
                            { unit: 'pieces', label: 'Pieces', icon: '📦', category: 'count' },
                            ...suggestions.filter(s => !['meter', 'pieces'].includes(s.unit))
                          ];
                        } else if (categoryName.includes('powder') || categoryName.includes('cement')) {
                          suggestions = [
                            { unit: 'kg', label: 'Kilograms', icon: '⚖️', category: 'weight' },
                            { unit: 'boxes', label: 'Boxes', icon: '📦', category: 'container' },
                            ...suggestions.filter(s => !['kg', 'boxes'].includes(s.unit))
                          ];
                        }

                        return suggestions.slice(0, 5).map((unitSuggestion) => (
                          <Button
                            key={unitSuggestion.unit}
                            type="button"
                            size="sm"
                            variant={item.unit === unitSuggestion.unit ? "default" : "outline"}
                            onClick={() => updateNewItem(index, 'unit', unitSuggestion.unit)}
                            className="text-xs h-7 px-2"
                            title={`Recommended for ${unitSuggestion.category} materials`}
                          >
                            {unitSuggestion.icon} {unitSuggestion.label}
                          </Button>
                        ));
                      })()}
                    </div>
                    <p className="text-xs text-purple-600">
                      💡 Suggestions are based on your selected category
                    </p>
                  </div>

                  {/* Quantity vs Threshold Visualization */}
                  {item.quantity > 0 && item.threshold && (
                    <div className="space-y-2">
                      <Label className="text-sm text-purple-800">Stock Level Preview:</Label>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-purple-700">
                          <span>Low Stock Alert</span>
                          <span>Current Stock</span>
                        </div>
                        <div className="w-full h-3 bg-purple-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-red-400 rounded-full"
                            style={{ width: `${Math.min(100, (item.threshold / item.quantity) * 100)}%` }}
                          />
                          <div
                            className="h-full bg-green-400 rounded-full -mt-3"
                            style={{
                              width: `${Math.max(0, 100 - (item.threshold / item.quantity) * 100)}%`,
                              marginLeft: `${Math.min(100, (item.threshold / item.quantity) * 100)}%`
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-purple-600">
                          <span>≤ {item.threshold} {item.unit}</span>
                          <span>{item.quantity} {item.unit}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
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

      <div className="space-y-4">
        <Label className="text-lg font-semibold">Tools to Borrow</Label>
        {items.map((item) => {
          const availableUnits = item.units?.filter(u => u.isAvailable) || [];
          const selectedCount = selectedUnits[item.id]?.length || 0;
          const currentMode = selectionMode[item.id] || 'quantity';
          const borrowQuantity = borrowQuantities[item.id] || 0;

          // Group units by condition for display
          const unitsByCondition = availableUnits.reduce((acc, unit) => {
            if (!acc[unit.condition]) acc[unit.condition] = [];
            acc[unit.condition].push(unit);
            return acc;
          }, {} as Record<string, any[]>);

          return (
            <div key={item.id} className="p-5 border rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-200">
              <div className="space-y-4">
                {/* Tool Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900 text-lg">{item.name}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                      <span className="flex items-center">
                        <Package className="w-4 h-4 mr-1" />
                        Available: {availableUnits.length} units
                      </span>
                      <span className="flex items-center">
                        <User className="w-4 h-4 mr-1" />
                        Selected: {selectedCount} units
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={selectedCount > 0 ? "default" : "secondary"} className="mb-2">
                      {selectedCount > 0 ? `${selectedCount} selected` : 'None selected'}
                    </Badge>
                    {selectedCount > 0 && (
                      <div className="text-xs text-gray-500">
                        {Math.round((selectedCount / availableUnits.length) * 100)}% of available
                      </div>
                    )}
                  </div>
                </div>

                {/* Selection Mode Toggle */}
                <div className="bg-gray-50 rounded-lg p-3 border">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-sm font-medium text-gray-700">Selection Mode:</Label>
                    <div className="flex bg-white rounded-lg p-1 border">
                      <button
                        type="button"
                        onClick={() => toggleSelectionMode(item.id, 'quantity')}
                        className={cn(
                          "px-3 py-1 text-xs rounded transition-all",
                          currentMode === 'quantity'
                            ? "bg-blue-500 text-white shadow-sm"
                            : "text-gray-600 hover:text-gray-800"
                        )}
                      >
                        Smart Select
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleSelectionMode(item.id, 'manual')}
                        className={cn(
                          "px-3 py-1 text-xs rounded transition-all",
                          currentMode === 'manual'
                            ? "bg-blue-500 text-white shadow-sm"
                            : "text-gray-600 hover:text-gray-800"
                        )}
                      >
                        Manual Select
                      </button>
                    </div>
                  </div>

                  {/* Smart Selection Mode */}
                  {currentMode === 'quantity' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-gray-600 mb-1 block">Quantity to Borrow</Label>
                          <Input
                            type="number"
                            min="0"
                            max={availableUnits.length}
                            value={borrowQuantity}
                            onChange={(e) => updateBorrowQuantity(item.id, parseInt(e.target.value) || 0, availableUnits)}
                            className="h-8 text-sm"
                            placeholder="Enter quantity"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-600 mb-1 block">Prefer Condition</Label>
                          <Select
                            value="EXCELLENT"
                            onValueChange={(condition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR') => {
                              if (borrowQuantity > 0) {
                                selectUnitsByQuantity(item.id, borrowQuantity, availableUnits, condition);
                              }
                            }}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="EXCELLENT">Excellent First</SelectItem>
                              <SelectItem value="GOOD">Good First</SelectItem>
                              <SelectItem value="FAIR">Fair First</SelectItem>
                              <SelectItem value="POOR">Poor First</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Quick Selection Buttons */}
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(unitsByCondition).map(([condition, units]) => (
                          <Button
                            key={condition}
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => selectUnitsByCondition(item.id, condition as any, availableUnits)}
                            className="text-xs h-7 px-2"
                          >
                            All {condition} ({units.length})
                          </Button>
                        ))}
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedUnits(prev => ({ ...prev, [item.id]: [] }))}
                          className="text-xs h-7 px-2 text-red-600 hover:text-red-700"
                        >
                          Clear All
                        </Button>
                      </div>

                      {/* Selection Preview */}
                      {selectedCount > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="text-sm text-blue-800 font-medium mb-2">
                            Selected Units Preview ({selectedCount} units):
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {availableUnits
                              .filter(unit => selectedUnits[item.id]?.includes(unit.id))
                              .slice(0, 10) // Show first 10
                              .map(unit => (
                                <Badge
                                  key={unit.id}
                                  className={cn(
                                    "text-xs",
                                    unit.condition === 'EXCELLENT' ? "bg-green-100 text-green-800" :
                                    unit.condition === 'GOOD' ? "bg-blue-100 text-blue-800" :
                                    unit.condition === 'FAIR' ? "bg-yellow-100 text-yellow-800" :
                                    "bg-red-100 text-red-800"
                                  )}
                                >
                                  #{unit.unitNumber}
                                </Badge>
                              ))}
                            {selectedCount > 10 && (
                              <span className="text-xs text-blue-600">+{selectedCount - 10} more</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Manual Selection Mode */}
                  {currentMode === 'manual' && availableUnits.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium text-gray-700">Manual Unit Selection:</Label>
                        <div className="flex space-x-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
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

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto border rounded-lg p-2 bg-white">
                        {availableUnits.map((unit) => (
                          <div
                            key={unit.id}
                            className={cn(
                              "flex items-center space-x-2 p-2 border rounded cursor-pointer transition-all text-sm",
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
                              className="h-3 w-3 text-blue-600 rounded"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <Label htmlFor={`unit-${unit.id}`} className="text-xs font-medium text-gray-900 cursor-pointer">
                                  #{unit.unitNumber}
                                </Label>
                                <Badge
                                  className={cn(
                                    "text-xs px-1 py-0",
                                    unit.condition === 'EXCELLENT' ? "bg-green-100 text-green-700" :
                                    unit.condition === 'GOOD' ? "bg-blue-100 text-blue-700" :
                                    unit.condition === 'FAIR' ? "bg-yellow-100 text-yellow-700" :
                                    "bg-red-100 text-red-700"
                                  )}
                                >
                                  {unit.condition.charAt(0)}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* No Units Available */}
                {availableUnits.length === 0 && (
                  <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-medium">No units available for borrowing</p>
                    <p className="text-xs text-gray-400 mt-1">All units may be currently borrowed</p>
                  </div>
                )}

                {/* Enhanced Selection Summary */}
                {selectedCount > 0 && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-blue-800 font-semibold text-sm">
                        ✓ {selectedCount} unit{selectedCount > 1 ? 's' : ''} selected for borrowing
                      </span>
                      <Badge className="bg-blue-100 text-blue-800">
                        {Math.round((selectedCount / availableUnits.length) * 100)}% selected
                      </Badge>
                    </div>

                    {/* Condition breakdown */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {Object.entries(
                        availableUnits
                          .filter(u => selectedUnits[item.id]?.includes(u.id))
                          .reduce((acc, unit) => {
                            acc[unit.condition] = (acc[unit.condition] || 0) + 1;
                            return acc;
                          }, {} as Record<string, number>)
                      ).map(([condition, count]) => (
                        <Badge
                          key={condition}
                          className={cn(
                            "text-xs",
                            condition === 'EXCELLENT' ? "bg-green-100 text-green-700" :
                            condition === 'GOOD' ? "bg-blue-100 text-blue-700" :
                            condition === 'FAIR' ? "bg-yellow-100 text-yellow-700" :
                            "bg-red-100 text-red-700"
                          )}
                        >
                          {count} {condition}
                        </Badge>
                      ))}
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

      <div className="space-y-4">
        <Label className="text-lg font-semibold">Materials to Consume</Label>
        {items.map((item) => {
          const availableQty = item.quantity || item.currentQuantity || item.available || 0;
          const currentQty = itemQuantities[item.id] || 0.001;
          const percentageUsed = (currentQty / availableQty) * 100;

          return (
            <div key={item.id} className="p-4 border rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-200">
              <div className="space-y-3">
                {/* Material Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900 text-lg">{item.name}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                      <span className="flex items-center">
                        <Package className="w-4 h-4 mr-1" />
                        Available: {availableQty} {item.unit}
                      </span>
                      <span className="flex items-center">
                        <AlertTriangle className="w-4 h-4 mr-1" />
                        Consuming: {currentQty} {item.unit}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={percentageUsed > 50 ? "destructive" : percentageUsed > 25 ? "secondary" : "default"}>
                      {percentageUsed.toFixed(1)}% of stock
                    </Badge>
                    {percentageUsed > 75 && (
                      <div className="text-xs text-red-600 mt-1">⚠️ High consumption</div>
                    )}
                  </div>
                </div>

                {/* Quantity Input Section */}
                <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-sm font-medium text-purple-800">Consumption Quantity:</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id={`consume-quantity-${item.id}`}
                        name={`consume-quantity-${item.id}`}
                        type="number"
                        value={currentQty}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0.001;
                          setItemQuantities(prev => ({
                            ...prev,
                            [item.id]: Number(Math.max(0.001, Math.min(value, availableQty)).toFixed(3))
                          }));
                        }}
                        onFocus={(e) => e.target.select()}
                        min="0.001"
                        max={availableQty}
                        step="0.001"
                        className="w-24 h-8 text-sm"
                        required
                      />
                      <span className="text-sm text-purple-700 font-medium">{item.unit}</span>
                    </div>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="space-y-2">
                    <Label className="text-xs text-purple-700">Quick Presets:</Label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: '10%', value: availableQty * 0.1, icon: '🔹' },
                        { label: '25%', value: availableQty * 0.25, icon: '🔸' },
                        { label: '50%', value: availableQty * 0.5, icon: '🔶' },
                        { label: '75%', value: availableQty * 0.75, icon: '🔺' },
                        { label: 'All', value: availableQty, icon: '🔴' }
                      ].map((preset) => (
                        <Button
                          key={preset.label}
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setItemQuantities(prev => ({
                              ...prev,
                              [item.id]: Number(Math.max(0.001, preset.value).toFixed(3))
                            }));
                          }}
                          className="text-xs h-7 px-2"
                          disabled={preset.value > availableQty}
                        >
                          {preset.icon} {preset.label}
                          <span className="ml-1 text-xs opacity-75">
                            ({preset.value.toFixed(1)})
                          </span>
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Amount Shortcuts */}
                  <div className="space-y-2 mt-3">
                    <Label className="text-xs text-purple-700">Common Amounts:</Label>
                    <div className="flex flex-wrap gap-2">
                      {[1, 5, 10, 25, 50, 100].filter(amount => amount <= availableQty).map((amount) => (
                        <Button
                          key={amount}
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setItemQuantities(prev => ({
                              ...prev,
                              [item.id]: amount
                            }));
                          }}
                          className="text-xs h-6 px-2"
                        >
                          {amount} {item.unit}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Consumption Impact Visualization */}
                <div className="space-y-2">
                  <Label className="text-sm text-gray-700">Stock Impact Preview:</Label>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>After consumption</span>
                      <span>Remaining: {(availableQty - currentQty).toFixed(3)} {item.unit}</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all duration-300",
                          percentageUsed > 75 ? "bg-red-500" :
                          percentageUsed > 50 ? "bg-yellow-500" :
                          percentageUsed > 25 ? "bg-blue-500" :
                          "bg-green-500"
                        )}
                        style={{ width: `${Math.min(100, percentageUsed)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>0</span>
                      <span>{availableQty} {item.unit}</span>
                    </div>
                  </div>
                </div>

                {/* Warning for high consumption */}
                {percentageUsed > 75 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <div className="text-sm text-red-800">
                      <span className="font-medium">High consumption warning:</span> You're consuming {percentageUsed.toFixed(1)}% of available stock.
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

  const renderProcessForm = () => {
    if (hasMixed) {
      return (
        <div className="space-y-6">
          {/* Mixed Process Header */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Mixed Transaction Processing</h3>
              <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                {selectedTools.length + selectedMaterials.length} items selected
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2 text-blue-700">
                <Wrench className="w-4 h-4" />
                <span>{selectedTools.length} tools to borrow</span>
              </div>
              <div className="flex items-center space-x-2 text-purple-700">
                <Package className="w-4 h-4" />
                <span>{selectedMaterials.length} materials to consume</span>
              </div>
            </div>
            <div className="mt-3 text-xs text-gray-600 bg-white rounded p-2 border">
              💡 <strong>Smart Workflow:</strong> Complete both transactions in one go. The system will process borrowing and consumption simultaneously.
            </div>
          </div>

          <Tabs value={processType} onValueChange={(value: any) => setProcessType(value)} className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 h-12">
              <TabsTrigger value="borrow" disabled={!hasTools} className="flex items-center space-x-2 h-10">
                <Wrench className="w-4 h-4" />
                <div className="text-left">
                  <div className="font-medium">Borrow Tools</div>
                  <div className="text-xs opacity-75">{selectedTools.length} items</div>
                </div>
              </TabsTrigger>
              <TabsTrigger value="consume" disabled={!hasMaterials} className="flex items-center space-x-2 h-10">
                <Package className="w-4 h-4" />
                <div className="text-left">
                  <div className="font-medium">Consume Materials</div>
                  <div className="text-xs opacity-75">{selectedMaterials.length} items</div>
                </div>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="borrow" className="space-y-4">
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200 mb-4">
                <div className="flex items-center space-x-2 text-blue-800 text-sm">
                  <Info className="w-4 h-4" />
                  <span>Configure borrowing details for {selectedTools.length} tool{selectedTools.length > 1 ? 's' : ''}. Materials will be processed separately.</span>
                </div>
              </div>
              {renderBorrowForm(selectedTools)}
            </TabsContent>

            <TabsContent value="consume" className="space-y-4">
              <div className="bg-purple-50 rounded-lg p-3 border border-purple-200 mb-4">
                <div className="flex items-center space-x-2 text-purple-800 text-sm">
                  <Info className="w-4 h-4" />
                  <span>Configure consumption details for {selectedMaterials.length} material{selectedMaterials.length > 1 ? 's' : ''}. Tools will be processed separately.</span>
                </div>
              </div>
              {renderConsumeForm(selectedMaterials)}
            </TabsContent>
          </Tabs>

          {/* Mixed Process Summary */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h4 className="font-medium text-gray-900 mb-3">Transaction Summary</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-blue-700 font-medium">
                  <Wrench className="w-4 h-4" />
                  <span>Borrowing Summary</span>
                </div>
                <div className="pl-6 space-y-1 text-gray-600">
                  <div>Borrower: {borrowForm.borrowerName || 'Not specified'}</div>
                  <div>Due Date: {borrowForm.dueDate ? new Date(borrowForm.dueDate).toLocaleDateString() : 'Not specified'}</div>
                  <div>Tools: {selectedTools.length} items</div>
                  <div>Units: {Object.values(selectedUnits).flat().length} total units</div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-purple-700 font-medium">
                  <Package className="w-4 h-4" />
                  <span>Consumption Summary</span>
                </div>
                <div className="pl-6 space-y-1 text-gray-600">
                  <div>Consumer: {consumeForm.consumerName || 'Not specified'}</div>
                  <div>Project: {consumeForm.projectName || 'Not specified'}</div>
                  <div>Materials: {selectedMaterials.length} items</div>
                  <div>Total Value: Calculated on submit</div>
                </div>
              </div>
            </div>
          </div>
        </div>
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
