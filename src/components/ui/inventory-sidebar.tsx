import React, { useState, useEffect } from 'react';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { Textarea } from './textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import { Badge } from './badge';
import { DateTimePicker } from './datetime-picker';
import { useToast } from '@/hooks/use-toast';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { cn } from '@/lib/utils';
import {
  X,
  Plus,
  Minus,
  Package,
  Wrench,
  User,
  AlertTriangle,
  Info,
  CheckCircle
} from 'lucide-react';

export interface ToolUnit {
  id: string;
  displayId?: string;
  unitNumber: number;
  condition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  isAvailable: boolean;
  notes?: string;
}

export interface InventoryItem {
   id: string;
   name: string;
   type: 'tool' | 'material';
   category: string;
   quantity?: number;
   unit?: string;
   condition?: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
   units?: ToolUnit[];
   available?: number;
   total?: number;
   totalQuantity?: number;
   threshold?: number;
   supplier?: string;
   location?: string;
   currentQuantity?: number;
   thresholdQuantity?: number;
 }

export interface SelectedItem extends InventoryItem {
   selectedQuantity?: number;
   categoryId?: string;
   totalQuantity?: number;
   availableQuantity?: number;
   currentQuantity?: number;
   thresholdQuantity?: number;
   stockStatus?: string;
   isLowStock?: boolean;
   borrowedQuantity?: number;
   unitPrice?: number;
   createdAt?: string;
   updatedAt?: string;
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
  units?: ToolUnit[];
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

interface Category {
  id: string;
  name: string;
  type: string;
}

type SidebarType = 'create' | 'edit' | 'process' | 'delete';
type EditTab = 'basic' | 'quantities';
type ProcessType = 'borrow' | 'consume';
type SelectionMode = 'manual' | 'quantity';

interface FormData {
  name?: string;
  category?: string;
  quantity?: number;
  totalQuantity?: number;
  availableQuantity?: number;
  currentQuantity?: number;
  threshold?: number;
  thresholdQuantity?: number;
  unit?: string;
  location?: string;
  supplier?: string;
  id?: string;
}

interface BorrowFormData {
  borrowerName: string;
  dueDate: string;
  purpose: string;
  notes: string;
}

interface ConsumeFormData {
  consumerName: string;
  purpose: string;
  projectName: string;
  notes: string;
}

interface SidebarFormProps {
  isOpen: boolean;
  onClose: () => void;
  type: SidebarType;
  selectedItems?: SelectedItem[];
  editItem?: InventoryItem;
  onSubmit: (formData: unknown) => void;
  toolCategories?: Category[];
  materialCategories?: Category[];
}

// Kategori sekarang berasal dari prop, bukan hardcoded

const units = [
  { value: 'kg', label: 'Kilograms (kg)' },
  { value: 'meter', label: 'Meters (m)' },
  { value: 'liters', label: 'Liters (L)' },
  { value: 'pieces', label: 'Pieces (pcs)' },
  { value: 'boxes', label: 'Boxes' },
  { value: 'roll', labe: 'Rolls'}
];


export function InventorySidebar({ 
  isOpen, 
  onClose, 
  type, 
  selectedItems = [], 
  editItem, 
  onSubmit, 
  toolCategories = [], 
  materialCategories = [] 
}: SidebarFormProps): React.JSX.Element | null {
  const [formData, setFormData] = useState<FormData>({});
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
  const [processType, setProcessType] = useState<ProcessType>('borrow');
  const [borrowForm, setBorrowForm] = useState<BorrowFormData>({
    borrowerName: '',
    dueDate: '',
    purpose: '',
    notes: ''
  });
  const [consumeForm, setConsumeForm] = useState<ConsumeFormData>({
    consumerName: '',
    purpose: '',
    projectName: '',
    notes: ''
  });
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});
  const [selectedUnits, setSelectedUnits] = useState<Record<string, string[]>>({});
  const [borrowQuantities, setBorrowQuantities] = useState<Record<string, number>>({});
  const [selectionMode, setSelectionMode] = useState<Record<string, SelectionMode>>({});
  const [editTab, setEditTab] = useState<EditTab>('basic');
  
  // Use BodyScroll
  useBodyScrollLock(isOpen); // gunakan isOpen karena sidebar hanya lock saat terbuka

  // Initialize hooks
  const { toast } = useToast();

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

  const validateMaterialQuantities = (): void => {
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
    const baseData: FormData = {
      name: editItem.name,
      category: editItem.category,
      location: editItem.location || '',
      supplier: editItem.supplier || ''
    };

    if (editItem.type === 'tool') {
      baseData.totalQuantity = editItem.total || editItem.totalQuantity || 1;
      baseData.availableQuantity = editItem.available;
    } else if (editItem.type === 'material') {
      // Gunakan currentQuantity untuk material, bukan quantity
      baseData.currentQuantity = editItem.currentQuantity || editItem.quantity || 0;
      baseData.thresholdQuantity = editItem.thresholdQuantity || editItem.threshold || 10;
      baseData.unit = editItem.unit || 'pieces';
    }

    setFormData(baseData);
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
      setEditTab('basic'); // Reset edit tab
    }
  }, [isOpen]);
  
  // Effect to handle body scroll lock
  // useEffect(() => {
  //   if (!isOpen) return;
    
  //   // Save current scroll position
  //   const scrollY = window.scrollY;
  //   document.body.style.position = 'fixed';
  //   document.body.style.top = `-${scrollY}px`;
  //   document.body.style.width = '100%';
  //   document.body.classList.add('overflow-hidden');
    
  //   return () => {
  //     // Restore scroll position and body overflow
  //     const scrollY = document.body.style.top;
  //     document.body.style.position = '';
  //     document.body.style.top = '';
  //     document.body.style.width = '';
  //     document.body.classList.remove('overflow-hidden');
  //     if (scrollY) {
  //       window.scrollTo(0, parseInt(scrollY || '0', 10) * -1);
  //     }
  //   };
  // }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
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
              category: formData.category,
              location: formData.location,
              supplier: formData.supplier,
              // Apply the quantity change to current total
              totalQuantity: formData.totalQuantity !== undefined ? formData.totalQuantity : 
                            Math.max(1, (editItem.total || editItem.totalQuantity || 1) + (formData.quantity || 0))
            }
          : {
              id: editItem?.id,
              name: formData.name,
              category: formData.category,
              location: formData.location,
              supplier: formData.supplier,
              // Apply the quantity change to current stock
              currentQuantity: formData.currentQuantity,
              thresholdQuantity: formData.thresholdQuantity || formData.threshold,
              unit: formData.unit
            };
        
        console.log('Edit payload:', editPayload); // Debug log
        onSubmit(editPayload);
        break;
      case 'process':
        if (hasMixed) {
        // Handle mixed process - process both borrow and consume
        console.log('Processing mixed transaction...');

        // Validate both forms are complete
        const borrowComplete = borrowForm.borrowerName && borrowForm.dueDate && borrowForm.purpose &&
                              Object.values(selectedUnits).flat().length > 0;
        const consumeComplete = consumeForm.consumerName && consumeForm.purpose &&
                              Object.keys(itemQuantities).filter(id => itemQuantities[id] > 0).length > 0;

        if (!borrowComplete) {
          throw new Error('Please complete the borrowing form and select tools before submitting');
        }

        if (!consumeComplete) {
          throw new Error('Please complete the consumption form and set material quantities before submitting');
        }

        // Validate material quantities
        validateMaterialQuantities();

        // Prepare mixed payload
        const mixedPayload = {
          type: 'mixed',
          borrow: {
            borrowerName: borrowForm.borrowerName,
            dueDate: new Date(borrowForm.dueDate).toISOString(),
            purpose: borrowForm.purpose,
            notes: borrowForm.notes,
            items: selectedItems
              .filter(item => item.type === 'tool')
              .map(tool => ({
                toolId: tool.id,
                units: selectedUnits[tool.id] || [],
                notes: borrowForm.notes
              }))
          },
          consume: {
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
          }
        };
        onSubmit(mixedPayload);
        } else if (processType === 'borrow' && hasTools) {
        // Borrow only ...
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
          } else if (processType === 'consume' && hasMaterials) {
            // Consume only ...
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
        }
      break;
      case 'delete':
        onSubmit({ items: selectedItems });
        break;
      }

      onClose();
    } catch (error) {
      console.error('Form submission error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred while processing the form';
      toast({
        type: 'error',
        title: 'Form Submission Failed',
        description: errorMessage
      });
    }
  };

  const addNewItem = (): void => {
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

  const removeNewItem = (index: number): void => {
    if (newItems.length > 1) {
      setNewItems(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Smart unit selection functions
  const selectUnitsByQuantity = (toolId: string, quantity: number, availableUnits: ToolUnit[]): void => {
    // Sort units by condition preference (excellent first, then good, etc.)
    const conditionPriority = { 'EXCELLENT': 4, 'GOOD': 3, 'FAIR': 2, 'POOR': 1 } as const;
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

  const selectUnitsByCondition = (
    toolId: string, 
    condition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR', 
    availableUnits: ToolUnit[]
  ): void => {
    const unitsWithCondition = availableUnits.filter(unit => unit.condition === condition);
    const selectedUnitIds = unitsWithCondition.map(unit => unit.id);

    setSelectedUnits(prev => ({
      ...prev,
      [toolId]: selectedUnitIds
    }));
  };

  const toggleSelectionMode = (toolId: string, mode: SelectionMode): void => {
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

  const updateBorrowQuantity = (toolId: string, quantity: number, availableUnits: ToolUnit[]): void => {
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

  const updateConditionDistribution = (
    index: number, 
    condition: keyof NewItem['conditionDistribution'], 
    value: number
  ): void => {
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

  const updateNewItem = (index: number, field: string, value: unknown): void => {
    setNewItems(prev => prev.map((item, i) => {
      if (i !== index) return item;

      if (field === 'type') {
        // Reset item for new type
        const newType = value as 'tool' | 'material';
        return {
          ...item,
          type: newType,
          category: newType === 'tool' ? (toolCategories[0]?.id || '') : (materialCategories[0]?.id || ''),
          defaultCondition: newType === 'tool' ? 'GOOD' : undefined,
          useDefaultCondition: newType === 'tool' ? true : undefined,
          conditionDistribution: newType === 'tool' ? {
            excellent: 0,
            good: 1,
            fair: 0,
            poor: 0
          } : undefined
        };
      }

      if (field === 'quantity' && item.type === 'tool') {
        const newQuantity = parseInt(value as string) || 1;

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

  const getTitle = (): string => {
    switch (type) {
      case 'create': return 'Create Items';
      case 'edit': return 'Edit Item';
      case 'process': return 'Process Transaction';
      case 'delete': return 'Delete Items';
      default: return 'Form';
    }
  };



  const renderCreateForm = (): React.JSX.Element => (
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
                          { unit: 'boxes', label: 'Boxes', icon: '📦', category: 'container' },
                          { unit: 'roll', label: 'Rolls', icon: '🧻', category: 'length' }
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
                            { unit: 'roll', label: 'Rolls', icon: '🌀', category: 'lenght' },
                            ...suggestions.filter(s => !['meter', 'pieces', 'roll'].includes(s.unit))
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

  const renderEditForm = (): React.JSX.Element => {
    return (
      <Tabs value={editTab} onValueChange={(value: string) => setEditTab(value as 'basic' | 'quantities')} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="quantities">Quantities</TabsTrigger>
        </TabsList>
        
        <TabsContent value="basic" className="space-y-4">
          <div>
            <Label htmlFor="name">Nama Item</Label>
            <Input
              id="name"
              value={(formData.name as string) || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          <div>
            <Label htmlFor="category">Kategori</Label>
            <Select value={formData.category || ''} onValueChange={(value: string) => setFormData((prev) => ({ ...prev, category: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih kategori" />
              </SelectTrigger>
              <SelectContent>
                {(editItem?.type === 'tool' ? toolCategories : materialCategories).map((cat: Category) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Read-only quantity display */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quantityDisplay">Current Quantity</Label>
              <Input
                id="quantityDisplay"
                type="number"
                value={formData.quantity || 1}
                disabled
                className="bg-gray-100 text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">Use the &ldquo;Quantities&rdquo; tab to adjust quantities</p>
            </div>

            {editItem?.type === 'material' && (
              <div>
                <Label htmlFor="unit">Unit</Label>
                <Select value={formData.unit || ''} onValueChange={(value: string) => setFormData((prev) => ({ ...prev, unit: value }))}>
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
          </div>

          <div>
            <Label htmlFor="location">Lokasi</Label>
            <Input
              id="location"
              value={formData.location || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
              placeholder="Gudang, Rak, dll"
            />
          </div>

          <div>
            <Label htmlFor="supplier">Supplier</Label>
            <Input
              id="supplier"
              value={formData.supplier || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, supplier: e.target.value }))}
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
                onChange={(e) => setFormData((prev) => ({ ...prev, threshold: parseInt(e.target.value) || 10 }))}
                min="1"
              />
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="quantities" className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">Quantity Management</h3>
            <p className="text-sm text-blue-700">Add or remove items from the current stock. Use positive numbers to add, negative to subtract.</p>
          </div>
          
          {editItem?.type === 'tool' ? (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-3">Tool Quantities</h4>
                <div className="space-y-4">
                  <div className="p-3 bg-white rounded-lg border border-gray-200">
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">Current Total Quantity</Label>
                    <div className="text-2xl font-bold text-gray-900">{editItem?.total || editItem?.totalQuantity || 1}</div>
                    <div className="text-sm text-gray-500">Available: {editItem?.available || formData.quantity || 1}</div>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">Add/Remove Quantity</Label>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          value={formData.quantity || 0}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 0;
                            setFormData(prev => ({ ...prev, quantity: value }));
                          }}
                          placeholder="Enter quantity to add (+) or remove (-)"
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const current = editItem?.total || editItem?.totalQuantity || 1;
                            const changeAmount = formData.quantity || 0;
                            const newTotal = Math.max(1, current + changeAmount);
                            setFormData(prev => ({ ...prev, totalQuantity: newTotal }));
                          }}
                        >
                          Apply Change
                        </Button>
                      </div>
                      <div className="text-xs text-gray-500">
                        Preview: {editItem?.total || editItem?.totalQuantity || 1} + ({formData.quantity || 0}) = {Math.max(1, (editItem?.total || editItem?.totalQuantity || 1) + (formData.quantity || 0))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <Info className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-yellow-800">
                        <strong>Examples:</strong>
                        <ul className="mt-1 space-y-1 text-xs">
                          <li>• Enter &quot;5&quot; to add 5 tools</li>
                          <li>• Enter &quot;-3&quot; to remove 3 tools</li>
                          <li>• Total cannot go below 1</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <Label>Available Quantity (Read-only)</Label>
                  <div>
                    <Label>Available Quantity</Label>
                    <Input
                      type="number"
                      value={editItem?.available || formData.quantity || 1}
                      disabled
                      className="bg-gray-100 text-gray-500 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500 mt-1">Auto-calculated based on borrowings</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-3">Material Quantities</h4>
                <div className="space-y-4">
                  <div className="p-3 bg-white rounded-lg border border-gray-200">
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">Current Stock</Label>
                    <div className="text-2xl font-bold text-gray-900">{editItem?.quantity || 0} {editItem?.unit}</div>
                    <div className="text-sm text-gray-500">Threshold: {editItem?.threshold || 10} {editItem?.unit}</div>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">Add/Remove Stock</Label>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          value={formData.quantity || 0}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            setFormData(prev => ({ ...prev, quantity: value }));
                          }}
                          placeholder="Enter quantity to add (+) or remove (-)"
                          step="0.1"
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const current = editItem?.quantity || 0;
                            const changeAmount = formData.quantity || 0;
                            const newStock = Math.max(0, current + changeAmount);
                            setFormData(prev => ({ ...prev, currentQuantity: newStock }));
                          }}
                        >
                          Apply Change
                        </Button>
                      </div>
                      <div className="text-xs text-gray-500">
                        Preview: {editItem?.quantity || 0} + ({formData.quantity || 0}) = {Math.max(0, (editItem?.quantity || 0) + (formData.quantity || 0))} {editItem?.unit}
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <Info className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-yellow-800">
                        <strong>Examples:</strong>
                        <ul className="mt-1 space-y-1 text-xs">
                          <li>• Enter &quot;15&quot; to add 15 units to stock</li>
                          <li>• Enter &quot;-5&quot; to remove 5 units from stock</li>
                          <li>• Stock cannot go below 0</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <div>
                    <Label>Low Stock Threshold</Label>
                    <Input
                      type="number"
                      value={formData.threshold || 10}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 10;
                        setFormData(prev => ({ ...prev, threshold: value, thresholdQuantity: value }));
                      }}
                      min="0"
                    />
                  </div>
                </div>
              </div>
              
              {/* Quick Actions */}
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-900 mb-3">Quick Add Actions</h4>
                <div className="flex flex-wrap gap-2 mb-3">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, quantity: 10 }));
                    }}
                  >
                    Add 10
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, quantity: 25 }));
                    }}
                  >
                    Add 25
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, quantity: 50 }));
                    }}
                  >
                    Add 50
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, quantity: 100 }));
                    }}
                  >
                    Add 100
                  </Button>
                </div>
                <h4 className="font-medium text-red-900 mb-3">Quick Remove Actions</h4>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, quantity: -5 }));
                    }}
                  >
                    Remove 5
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, quantity: -10 }));
                    }}
                  >
                    Remove 10
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const current = editItem?.quantity || 0;
                      setFormData(prev => ({ ...prev, quantity: -current }));
                    }}
                  >
                    Remove All
                  </Button>
                </div>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    );
  };

  const renderBorrowForm = (items: SelectedItem[]): React.JSX.Element => {
    console.log('Rendering borrow form with items:', items);
    console.log('Items with units:', items.map(item => ({ id: item.id, name: item.name, units: item.units })));

    const totalUnits = items.reduce((sum, item) => sum + (item.units?.filter(u => u.isAvailable)?.length || 0), 0);
    const selectedUnitsCount = Object.values(selectedUnits).flat().length;

    return (
      <div className="space-y-6">
        {/* Enhanced Transaction Header */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200/60 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <Wrench className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Borrowing Transaction</h3>
                <p className="text-xs text-gray-600">Configure tool borrowing details</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-gray-900">{items.length} Tools</div>
              <div className="text-xs text-gray-600">{totalUnits} units available</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center p-3 bg-white/60 rounded-lg border">
              <div className="font-semibold text-gray-900">{items.length}</div>
              <div className="text-gray-600">Tools</div>
            </div>
            <div className="text-center p-3 bg-white/60 rounded-lg border">
              <div className="font-semibold text-gray-900">{totalUnits}</div>
              <div className="text-gray-600">Available Units</div>
            </div>
            <div className="text-center p-3 bg-white/60 rounded-lg border">
              <div className="font-semibold text-blue-600">{selectedUnitsCount}</div>
              <div className="text-gray-600">Selected</div>
            </div>
          </div>
        </div>

        {/* Borrower Information */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Borrower Information</h3>
            <p className="text-sm text-gray-600 mt-1">Enter borrower details and transaction information</p>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">Borrower Name</Label>
                <Input
                  value={borrowForm.borrowerName}
                  onChange={(e) => setBorrowForm(prev => ({ ...prev, borrowerName: e.target.value }))}
                  placeholder="Enter borrower name"
                  className="mt-2"
                  required
                />
              </div>

              <div>
                <DateTimePicker
                  id="borrowDueDate"
                  label="Due Date & Time"
                  value={borrowForm.dueDate}
                  onChange={(value) => setBorrowForm(prev => ({ ...prev, dueDate: value }))}
                  min={new Date().toISOString().slice(0, 16)}
                  required
                  placeholder="Select due date and time for borrowing"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700">Purpose</Label>
              <Textarea
                value={borrowForm.purpose}
                onChange={(e) => setBorrowForm(prev => ({ ...prev, purpose: e.target.value }))}
                placeholder="Describe the purpose of borrowing these tools..."
                className="mt-2 min-h-[80px]"
                required
              />
              <div className="flex justify-between items-center mt-2">
                <div className="text-xs text-gray-500">
                  {borrowForm.purpose?.length || 0}/500 characters
                </div>
                {borrowForm.purpose && borrowForm.purpose.length > 0 && (
                  <div className="text-xs text-green-600">✓ Purpose provided</div>
                )}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700">Additional Notes</Label>
              <Textarea
                value={borrowForm.notes || ''}
                onChange={(e) => setBorrowForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any additional notes..."
                className="mt-2 min-h-[60px]"
              />
              <div className="text-xs text-gray-500 mt-2">
                {borrowForm.notes?.length || 0}/500 characters (optional)
              </div>
            </div>
          </div>
        </div>

        {/* Tools Selection */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Tools Selection</h3>
                <p className="text-sm text-gray-600 mt-1">Select specific units for each tool</p>
              </div>
              <div className="text-xs text-gray-500">
                {selectedUnitsCount}/{totalUnits} units selected
              </div>
            </div>
          </div>
          <div className="p-4 space-y-4">
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
          }, {} as Record<string, ToolUnit[]>);

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
                                selectUnitsByCondition(item.id, condition, availableUnits);
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
                            onClick={() => selectUnitsByCondition(item.id, condition as 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR', availableUnits)}
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
                                  {(unit as ToolUnit).displayId || `#${unit.unitNumber}`}
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
      </div>
    );
};

  const renderConsumeForm = (items: SelectedItem[]): React.JSX.Element => {
    console.log('Rendering consume form with items:', items);
    console.log('Items with quantities:', items.map(item => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      currentQuantity: item.currentQuantity,
      available: item.available,
      unit: item.unit
    })));

    const totalMaterials = items.length;
    const totalValue = items.reduce((sum, item) => {
      const qty = itemQuantities[item.id] || 0.001;
      const price = item.unitPrice || 0;
      return sum + (qty * price);
    }, 0);

    return (
      <div className="space-y-6">
        {/* Enhanced Transaction Header */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 border border-purple-200/60 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                <Package className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Consumption Transaction</h3>
                <p className="text-xs text-gray-600">Configure material consumption details</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-gray-900">{totalMaterials} Materials</div>
              <div className="text-xs text-gray-600">Ready for consumption</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center p-3 bg-white/60 rounded-lg border">
              <div className="font-semibold text-gray-900">{totalMaterials}</div>
              <div className="text-gray-600">Materials</div>
            </div>
            <div className="text-center p-3 bg-white/60 rounded-lg border">
              <div className="font-semibold text-gray-900">
                {items.reduce((sum, item) => sum + (itemQuantities[item.id] || 0.001), 0).toFixed(2)}
              </div>
              <div className="text-gray-600">Total Quantity</div>
            </div>
            <div className="text-center p-3 bg-white/60 rounded-lg border">
              <div className="font-semibold text-purple-600">
                {totalValue > 0 ? `$${totalValue.toFixed(2)}` : 'TBD'}
              </div>
              <div className="text-gray-600">Est. Value</div>
            </div>
          </div>
        </div>

        {/* Consumer Information */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Consumer Information</h3>
            <p className="text-sm text-gray-600 mt-1">Enter consumer details and consumption information</p>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">Consumer Name</Label>
                <Input
                  id="consume-consumer-name"
                  name="consume-consumer-name"
                  value={consumeForm.consumerName}
                  onChange={(e) => setConsumeForm(prev => ({ ...prev, consumerName: e.target.value }))}
                  placeholder="Enter consumer name"
                  className="mt-2"
                  required
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">Project Name</Label>
                <Input
                  id="consume-project-name"
                  name="consume-project-name"
                  value={consumeForm.projectName}
                  onChange={(e) => setConsumeForm(prev => ({ ...prev, projectName: e.target.value }))}
                  placeholder="Optional project name"
                  className="mt-2"
                />
                <div className="text-xs text-gray-500 mt-1">Optional - for project tracking</div>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700">Purpose</Label>
              <Textarea
                id="consume-purpose"
                name="consume-purpose"
                value={consumeForm.purpose}
                onChange={(e) => setConsumeForm(prev => ({ ...prev, purpose: e.target.value }))}
                placeholder="Describe the purpose of consuming these materials..."
                className="mt-2 min-h-[80px]"
                required
              />
              <div className="flex justify-between items-center mt-2">
                <div className="text-xs text-gray-500">
                  {consumeForm.purpose?.length || 0}/500 characters
                </div>
                {consumeForm.purpose && consumeForm.purpose.length > 0 && (
                  <div className="text-xs text-green-600">✓ Purpose provided</div>
                )}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700">Additional Notes</Label>
              <Textarea
                id="consume-notes"
                name="consume-notes"
                value={consumeForm.notes}
                onChange={(e) => setConsumeForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any additional notes..."
                className="mt-2 min-h-[60px]"
              />
              <div className="text-xs text-gray-500 mt-2">
                {consumeForm.notes?.length || 0}/500 characters (optional)
              </div>
            </div>
          </div>
        </div>

        {/* Materials Selection */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Materials Consumption</h3>
                <p className="text-sm text-gray-600 mt-1">Set consumption quantities for each material</p>
              </div>
              <div className="text-xs text-gray-500">
                {items.filter(item => itemQuantities[item.id] > 0).length}/{items.length} configured
              </div>
            </div>
          </div>
          <div className="p-4 space-y-4">
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
                      <span className="font-medium">High consumption warning:</span> You are consuming {percentageUsed.toFixed(1)}% of available stock.
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
          </div>
        </div>
      </div>
    );
};

  const renderProcessForm = (): React.JSX.Element => {
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

          <Tabs value={processType} onValueChange={(value) => setProcessType(value as 'borrow' | 'consume')} className="space-y-4">
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

  const renderDeleteForm = (): React.JSX.Element => (
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
      {/* Backdrop - covers entire screen */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="ml-auto w-full max-w-2xl glass border-l border-white/20 h-screen overflow-y-auto transition-all-smooth">
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

            {/* Enhanced Action Buttons */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-5 border border-gray-200 shadow-sm">
              {/* Progress Indicator for Process Forms */}
              {type === 'process' && (
                <div className="mb-5">
                  <div className="flex items-center justify-between text-sm mb-3">
                    <div className="flex items-center space-x-2">
                      {hasMixed ? (
                        <>
                          <Wrench className="w-4 h-4 text-blue-600" />
                          <Package className="w-4 h-4 text-purple-600" />
                        </>
                      ) : processType === 'borrow' ? (
                        <Wrench className="w-4 h-4 text-gray-600" />
                      ) : (
                        <Package className="w-4 h-4 text-gray-600" />
                      )}
                      <span className="font-medium text-gray-700">
                        {hasMixed
                          ? 'Mixed Transaction Progress'
                          : processType === 'borrow' ? 'Borrowing Progress' : 'Consumption Progress'
                        }
                      </span>
                    </div>
                    <span className="font-semibold text-gray-900">
                      {hasMixed
                        ? `${selectedTools.length} tools, ${selectedMaterials.length} materials`
                        : processType === 'borrow'
                        ? `${Object.values(selectedUnits).flat().length} units selected`
                        : `${Object.keys(itemQuantities).filter(id => itemQuantities[id] > 0).length}/${selectedItems.length} configured`
                      }
                    </span>
                  </div>

                  <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
                    <div
                      className={cn(
                        "h-3 rounded-full transition-all duration-500 shadow-sm",
                        hasMixed
                          ? "bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500"
                          : processType === 'borrow'
                          ? "bg-gradient-to-r from-blue-400 to-blue-500"
                          : "bg-gradient-to-r from-purple-400 to-purple-500"
                      )}
                      style={{
                        width: hasMixed
                          ? (() => {
                              const borrowComplete = borrowForm.borrowerName && borrowForm.dueDate && borrowForm.purpose && Object.values(selectedUnits).flat().length > 0;
                              const consumeComplete = consumeForm.consumerName && consumeForm.purpose && Object.keys(itemQuantities).filter(id => itemQuantities[id] > 0).length > 0;
                              const completionCount = (borrowComplete ? 1 : 0) + (consumeComplete ? 1 : 0);
                              return `${(completionCount / 2) * 100}%`;
                            })()
                          : processType === 'borrow'
                          ? `${Math.min(100, (Object.values(selectedUnits).flat().length / Math.max(1, selectedItems.reduce((sum, item) => sum + (item.units?.filter(u => u.isAvailable)?.length || 0), 0))) * 100)}%`
                          : `${(Object.keys(itemQuantities).filter(id => itemQuantities[id] > 0).length / Math.max(1, selectedItems.length)) * 100}%`
                      }}
                    ></div>
                  </div>

                  {/* Form Validation Status */}
                  <div className="flex justify-between mt-2 text-xs">
                    {hasMixed ? (
                      <>
                        <span className={cn(
                          "flex items-center space-x-1",
                          borrowForm.borrowerName && borrowForm.dueDate && borrowForm.purpose && Object.values(selectedUnits).flat().length > 0 ? "text-green-600" : "text-gray-500"
                        )}>
                          {borrowForm.borrowerName && borrowForm.dueDate && borrowForm.purpose && Object.values(selectedUnits).flat().length > 0 ?
                            <CheckCircle className="w-3 h-3" /> :
                            <div className="w-3 h-3 border border-gray-300 rounded-full" />
                          }
                          <span>Borrow Complete</span>
                        </span>
                        <span className={cn(
                          "flex items-center space-x-1",
                          consumeForm.consumerName && consumeForm.purpose && Object.keys(itemQuantities).filter(id => itemQuantities[id] > 0).length > 0 ? "text-green-600" : "text-gray-500"
                        )}>
                          {consumeForm.consumerName && consumeForm.purpose && Object.keys(itemQuantities).filter(id => itemQuantities[id] > 0).length > 0 ?
                            <CheckCircle className="w-3 h-3" /> :
                            <div className="w-3 h-3 border border-gray-300 rounded-full" />
                          }
                          <span>Consume Complete</span>
                        </span>
                      </>
                    ) : processType === 'borrow' ? (
                      <>
                        <span className={cn(
                          "flex items-center space-x-1",
                          borrowForm.borrowerName && borrowForm.dueDate && borrowForm.purpose ? "text-green-600" : "text-gray-500"
                        )}>
                          {borrowForm.borrowerName && borrowForm.dueDate && borrowForm.purpose ?
                            <CheckCircle className="w-3 h-3" /> :
                            <div className="w-3 h-3 border border-gray-300 rounded-full" />
                          }
                          <span>Form Complete</span>
                        </span>
                        <span className={cn(
                          "flex items-center space-x-1",
                          Object.values(selectedUnits).flat().length > 0 ? "text-green-600" : "text-gray-500"
                        )}>
                          {Object.values(selectedUnits).flat().length > 0 ?
                            <CheckCircle className="w-3 h-3" /> :
                            <div className="w-3 h-3 border border-gray-300 rounded-full" />
                          }
                          <span>Units Selected</span>
                        </span>
                      </>
                    ) : (
                      <>
                        <span className={cn(
                          "flex items-center space-x-1",
                          consumeForm.consumerName && consumeForm.purpose ? "text-green-600" : "text-gray-500"
                        )}>
                          {consumeForm.consumerName && consumeForm.purpose ?
                            <CheckCircle className="w-3 h-3" /> :
                            <div className="w-3 h-3 border border-gray-300 rounded-full" />
                          }
                          <span>Form Complete</span>
                        </span>
                        <span className={cn(
                          "flex items-center space-x-1",
                          Object.keys(itemQuantities).filter(id => itemQuantities[id] > 0).length === selectedItems.length ? "text-green-600" : "text-gray-500"
                        )}>
                          {Object.keys(itemQuantities).filter(id => itemQuantities[id] > 0).length === selectedItems.length ?
                            <CheckCircle className="w-3 h-3" /> :
                            <div className="w-3 h-3 border border-gray-300 rounded-full" />
                          }
                          <span>Quantities Set</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className="flex space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 hover:bg-gray-50 hover:text-gray-900 hover:border-gray-300 transition-all duration-200"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className={cn(
                    "flex-1 transition-all duration-200 shadow-sm hover:shadow-md",
                    type === 'delete'
                      ? "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
                      : type === 'process' && processType === 'borrow'
                      ? "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
                      : type === 'process' && processType === 'consume'
                      ? "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white"
                      : "bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white"
                  )}
                  disabled={
                    type === 'process' && hasMixed
                      ? // For mixed process, both forms must be complete
                        (!borrowForm.borrowerName || !borrowForm.dueDate || !borrowForm.purpose || Object.values(selectedUnits).flat().length === 0) ||
                        (!consumeForm.consumerName || !consumeForm.purpose || Object.keys(itemQuantities).filter(id => itemQuantities[id] > 0).length === 0)
                      : type === 'process' && processType === 'borrow'
                      ? !borrowForm.borrowerName || !borrowForm.dueDate || !borrowForm.purpose || Object.values(selectedUnits).flat().length === 0
                      : type === 'process' && processType === 'consume'
                      ? !consumeForm.consumerName || !consumeForm.purpose || Object.keys(itemQuantities).filter(id => itemQuantities[id] > 0).length === 0
                      : false
                  }
                >
                  {type === 'create' && (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Items
                    </>
                  )}
                  {type === 'edit' && (
                    <>
                      <Package className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                  {type === 'process' && hasMixed && (
                    <>
                      <Wrench className="w-4 h-4 mr-1" />
                      <Package className="w-4 h-4 mr-2" />
                      Process Mixed Transaction
                    </>
                  )}
                  {type === 'process' && !hasMixed && processType === 'borrow' && (
                    <>
                      <Wrench className="w-4 h-4 mr-2" />
                      Process Borrowing
                    </>
                  )}
                  {type === 'process' && !hasMixed && processType === 'consume' && (
                    <>
                      <Package className="w-4 h-4 mr-2" />
                      Process Consumption
                    </>
                  )}
                  {type === 'delete' && (
                    <>
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Delete Items
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
