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
  condition?: string;
  available?: number;
  total?: number;
  threshold?: number;
  supplier?: string;
}

interface SelectedItem extends InventoryItem {
  selectedQuantity?: number;
}

interface NewItem {
  name: string;
  type: 'tool' | 'material';
  category: string;
  quantity: number;
  unit?: string;
  condition?: string;
  threshold?: number;
  location?: string;
  supplier?: string;
}

interface SidebarFormProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'create' | 'edit' | 'process' | 'delete';
  selectedItems?: SelectedItem[];
  editItem?: InventoryItem;
  onSubmit: (formData: any) => void;
}

const categories = [
  { value: 'power-tools', label: 'Power Tools' },
  { value: 'hand-tools', label: 'Hand Tools' },
  { value: 'construction', label: 'Construction Materials' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'safety', label: 'Safety Equipment' },
  { value: 'measuring', label: 'Measuring Tools' }
];

const conditions = [
  { value: 'excellent', label: 'Excellent' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' }
];

const units = [
  { value: 'kg', label: 'Kilograms (kg)' },
  { value: 'meter', label: 'Meters (m)' },
  { value: 'liters', label: 'Liters (L)' },
  { value: 'pieces', label: 'Pieces (pcs)' },
  { value: 'boxes', label: 'Boxes' }
];

export function InventorySidebar({ isOpen, onClose, type, selectedItems = [], editItem, onSubmit }: SidebarFormProps) {
  const [formData, setFormData] = useState<any>({});
  const [newItems, setNewItems] = useState<NewItem[]>([{ name: '', type: 'tool', category: '', quantity: 1, condition: 'good', location: '', supplier: '' }]);
  const [processType, setProcessType] = useState<'borrow' | 'consume'>('borrow');

  // Check if selected items contain both tools and materials
  const hasTools = selectedItems.some(item => item.type === 'tool');
  const hasMaterials = selectedItems.some(item => item.type === 'material');
  const hasMixed = hasTools && hasMaterials;

  // Filter items by type for process form
  const selectedTools = selectedItems.filter(item => item.type === 'tool');
  const selectedMaterials = selectedItems.filter(item => item.type === 'material');

  useEffect(() => {
    if (type === 'edit' && editItem) {
      setFormData({
        name: editItem.name,
        category: editItem.category,
        quantity: editItem.quantity || editItem.total || 1,
        unit: editItem.unit || 'pieces',
        condition: editItem.condition || 'good',
        threshold: editItem.threshold || 10,
        supplier: editItem.supplier || ''
      });
    } else {
      setFormData({});
    }
  }, [type, editItem, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    switch (type) {
      case 'create':
        onSubmit({ items: newItems });
        break;
      case 'edit':
        onSubmit({ ...formData, id: editItem?.id });
        break;
      case 'process':
        onSubmit({
          type: processType,
          items: selectedItems,
          ...formData
        });
        break;
      case 'delete':
        onSubmit({ items: selectedItems });
        break;
    }

    onClose();
  };

  const addNewItem = () => {
    setNewItems(prev => [...prev, { name: '', type: 'tool', category: '', quantity: 1, condition: 'good', location: '', supplier: '' }]);
  };

  const removeNewItem = (index: number) => {
    if (newItems.length > 1) {
      setNewItems(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateNewItem = (index: number, field: string, value: any) => {
    setNewItems(prev => prev.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    ));
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

      {newItems.map((item, index) => (
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
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
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
              <div>
                <Label>Condition</Label>
                <Select value={item.condition} onValueChange={(value) => updateNewItem(index, 'condition', value)}>
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
            {categories.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
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

        {editItem?.type === 'tool' && (
          <div>
            <Label htmlFor="condition">Condition</Label>
            <Select value={formData.condition} onValueChange={(value) => setFormData((prev: any) => ({ ...prev, condition: value }))}>
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
        )}
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

  const renderBorrowForm = (items: SelectedItem[]) => (
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
            value={formData.borrower || ''}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, borrower: e.target.value }))}
            placeholder="Enter borrower name"
            required
          />
        </div>

        <div>
          <Label>Return Date</Label>
          <Input
            type="date"
            value={formData.returnDate || ''}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, returnDate: e.target.value }))}
            min={new Date().toISOString().split('T')[0]}
            required
          />
        </div>
      </div>

      <div>
        <Label>Purpose</Label>
        <Textarea
          value={formData.purpose || ''}
          onChange={(e) => setFormData((prev: any) => ({ ...prev, purpose: e.target.value }))}
          placeholder="Describe the purpose of borrowing these tools..."
          required
        />
      </div>

      <div className="space-y-3">
        <Label>Tools to Borrow</Label>
        {items.map((item, index) => (
          <div key={item.id} className="p-3 border rounded-lg bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-muted-foreground">Available: {item.available}/{item.total}</p>
              </div>
              <div className="w-24">
                <Input
                  type="number"
                  defaultValue="1"
                  min="1"
                  max={item.available}
                  className="text-center"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderConsumeForm = (items: SelectedItem[]) => (
    <div className="space-y-4">
      <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
        <h4 className="font-medium text-purple-900 mb-2">Consumption Transaction</h4>
        <p className="text-sm text-purple-700">
          Processing {items.length} material(s) for consumption
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Consumer Name</Label>
          <Input
            value={formData.consumer || ''}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, consumer: e.target.value }))}
            placeholder="Enter consumer name"
            required
          />
        </div>

        <div>
          <Label>Contact Email</Label>
          <Input
            type="email"
            value={formData.contactEmail || ''}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, contactEmail: e.target.value }))}
            placeholder="consumer@company.com"
          />
        </div>
      </div>

      <div>
        <Label>Purpose</Label>
        <Textarea
          value={formData.purpose || ''}
          onChange={(e) => setFormData((prev: any) => ({ ...prev, purpose: e.target.value }))}
          placeholder="Describe the purpose of consuming these materials..."
          required
        />
      </div>

      <div className="space-y-3">
        <Label>Materials to Consume</Label>
        {items.map((item, index) => (
          <div key={item.id} className="p-3 border rounded-lg bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-muted-foreground">
                  Available: {item.quantity} {item.unit}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Input
                  type="number"
                  defaultValue="1"
                  min="1"
                  max={item.quantity}
                  className="w-24 text-center"
                />
                <span className="text-sm text-muted-foreground">{item.unit}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

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
