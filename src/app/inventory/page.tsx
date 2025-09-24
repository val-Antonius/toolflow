'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { InventorySidebar } from '@/components/ui/inventory-sidebar';
import type { InventoryItem } from '@/components/ui/inventory-sidebar';
import { useToast } from '@/hooks/use-toast';
import { useLoading } from '@/lib/loading-context';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/utils';
import {
  Package,
  Wrench,
  Search,
  Plus,
  Edit,
  Trash2,
  FileText,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle,
  X
} from 'lucide-react';

// Types
interface Category {
  id: string;
  name: string;
  type: 'TOOL' | 'MATERIAL';
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface ToolUnit {
  id: string;
  displayId?: string;
  unitNumber: number;
  condition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  isAvailable: boolean;
  notes?: string;
}

interface Tool {
  id: string;
  displayId?: string;
  name: string;
  type: 'tool';
  category: {
    id: string;
    name: string;
    type: string;
  };
  totalQuantity: number;
  availableQuantity: number;
  hasActiveBorrowing: boolean;
  borrowedQuantity: number;
  location?: string;
  supplier?: string;
  createdAt: string;
  updatedAt: string;
  units?: ToolUnit[];
}

interface Material {
  id: string;
  displayId?: string;
  name: string;
  type: 'material';
  category: {
    id: string;
    name: string;
    type: string;
  };
  currentQuantity: number;
  thresholdQuantity: number;
  unit: string;
  isLowStock: boolean;
  stockStatus: string;
  location?: string;
  supplier?: string;
  createdAt: string;
  updatedAt: string;
}

interface SelectedItem {
  id: string;
  name: string;
  type: 'tool' | 'material';
  category: string;
  categoryId?: string;
  quantity?: number;
  currentQuantity?: number;
  unit?: string;
  threshold?: number;
  thresholdQuantity?: number;
  units?: ToolUnit[];
  available?: number;
  total?: number;
  totalQuantity?: number;
  availableQuantity?: number;
  supplier?: string;
  location?: string;
  hasActiveBorrowing?: boolean;
  borrowedQuantity?: number;
  stockStatus?: string;
  isLowStock?: boolean;
  createdAt?: string;
  updatedAt?: string;
}


type FormData = Record<string, unknown>;

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// API functions
const fetchTools = async (searchQuery: string = ''): Promise<Tool[]> => {
  try {
    const params = new URLSearchParams();
    if (searchQuery) params.append('search', searchQuery);

    const response = await fetch(`/api/tools?${params.toString()}`);
    const result: ApiResponse<Tool[]> = await response.json();

    if (result.success && result.data) {
      return result.data.map((tool) => ({
        ...tool,
        type: 'tool' as const,
        // Ensure units are properly typed
        units: tool.units?.map((unit) => ({
          id: unit.id,
          displayId: unit.displayId,
          unitNumber: unit.unitNumber,
          condition: unit.condition,
          isAvailable: unit.isAvailable,
          notes: unit.notes
        }))
      }));
    }
    return [];
  } catch (error) {
    console.error('Error fetching tools:', error);
    return [];
  }
};

const fetchMaterials = async (searchQuery: string = ''): Promise<Material[]> => {
  try {
    const params = new URLSearchParams();
    if (searchQuery) params.append('search', searchQuery);

    const response = await fetch(`/api/materials?${params.toString()}`);
    const result: ApiResponse<Material[]> = await response.json();

    if (result.success && result.data) {
      return result.data.map((material) => ({
        ...material,
        type: 'material' as const
      }));
    }
    return [];
  } catch (error) {
    console.error('Error fetching materials:', error);
    return [];
  }
};

export default function Inventory() {
  const [activeTab, setActiveTab] = useState("tools");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarType, setSidebarType] = useState<'create' | 'edit' | 'process' | 'delete'>('create');
  const [editItem, setEditItem] = useState<Tool | Material | null>(null);
  const [tools, setTools] = useState<Tool[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [toolPage, setToolPage] = useState(1);
  const [materialPage, setMaterialPage] = useState(1);
  const pageSize = 10; // Fixed page size, no need for state
  
  // Initialize hooks
  const { showLoading, hideLoading } = useLoading();
  const { toast } = useToast();

  const allItems = [...tools, ...materials];
  const selectedItemsData: SelectedItem[] = allItems
    .filter(item => selectedItems.includes(item.id))
    .map(item => {
      if (item.type === 'tool') {
        const tool = item as Tool;
        return {
          id: tool.id,
          name: tool.name,
          type: tool.type,
          category: tool.category.name,
          categoryId: tool.category.id,
          quantity: tool.totalQuantity,
          totalQuantity: tool.totalQuantity,
          availableQuantity: tool.availableQuantity,
          units: tool.units || [],
          available: tool.availableQuantity,
          total: tool.totalQuantity,
          supplier: tool.supplier,
          location: tool.location,
          hasActiveBorrowing: tool.hasActiveBorrowing || false,
          borrowedQuantity: tool.borrowedQuantity || 0,
          createdAt: tool.createdAt,
          updatedAt: tool.updatedAt
        };
      } else {
        const material = item as Material;
        return {
          id: material.id,
          name: material.name,
          type: material.type,
          category: material.category.name,
          categoryId: material.category.id,
          quantity: material.currentQuantity,
          currentQuantity: material.currentQuantity,
          unit: material.unit,
          threshold: material.thresholdQuantity,
          thresholdQuantity: material.thresholdQuantity,
          supplier: material.supplier,
          location: material.location,
          hasActiveBorrowing: false,
          stockStatus: material.stockStatus,
          isLowStock: material.isLowStock,
          createdAt: material.createdAt,
          updatedAt: material.updatedAt,
          available: material.currentQuantity
        };
      }
    });

  const allowedToolNames = ['Peralatan Lapangan', 'Peralatan Kantor', 'Peralatan Jaringan'];
  const allowedMaterialNames = ['Material Lapangan', 'Material Kantor', 'Material Jaringan'];
  const toolCategories = categories.filter((cat) => cat.type === 'TOOL' && allowedToolNames.includes(cat.name));
  const materialCategories = categories.filter((cat) => cat.type === 'MATERIAL' && allowedMaterialNames.includes(cat.name));

// Initial load (mount)
useEffect(() => {
  const loadInitial = async () => {
    setLoading(true);
    try {
      const [toolsData, materialsData, categoriesData] = await Promise.all([
        fetchTools(''),
        fetchMaterials(''),
        fetch('/api/categories').then(res => res.json()).then(res => res.success ? res.data : [])
      ]);
      setTools(toolsData);
      setMaterials(materialsData);
      setCategories(categoriesData);
      setToolPage(1);
      setMaterialPage(1);
    } catch (error) {
      console.error('Error loading inventory data:', error);
    } finally {
      setLoading(false);
    }
  };
  loadInitial();
}, []);

// Search updates with debounce but without full-page loading state
useEffect(() => {
  //if (searchQuery === '') return; // avoid duplicate initial fetch; initial effect handles empty search
  const loadSearch = async () => {
    setIsSearching(true);
    try {
      const [toolsData, materialsData] = await Promise.all([
        fetchTools(searchQuery),
        fetchMaterials(searchQuery)
      ]);
      setTools(toolsData);
      setMaterials(materialsData);
      setToolPage(1);
      setMaterialPage(1);
    } catch (error) {
      console.error('Error loading inventory data:', error);
    } finally {
      setIsSearching(false);
    }
  };
  const debounceTimer = setTimeout(loadSearch, 300);
  return () => clearTimeout(debounceTimer);
}, [searchQuery]);

  // Smart detection of selected item types
  const selectedTools = selectedItemsData.filter(item => item.type === 'tool');
  const selectedMaterials = selectedItemsData.filter(item => item.type === 'material');
  const hasTools = selectedTools.length > 0;
  const hasMaterials = selectedMaterials.length > 0;
  const hasMixed = hasTools && hasMaterials;

  const toggleRowExpansion = (id: string) => {
    setExpandedRows(prev =>
      prev.includes(id)
        ? prev.filter(rowId => rowId !== id)
        : [...prev, id]
    );
  };

  const toggleItemSelection = (id: string) => {
    setSelectedItems(prev =>
      prev.includes(id)
        ? prev.filter(itemId => itemId !== id)
        : [...prev, id]
    );
  };

  const selectAllItems = (checked: boolean) => {
    if (checked) {
      const currentTabItems = activeTab === 'tools' ? tools : materials;
      const currentTabIds = currentTabItems.map(item => item.id);
      setSelectedItems(prev => [...new Set([...prev, ...currentTabIds])]);
    } else {
      const currentTabItems = activeTab === 'tools' ? tools : materials;
      const currentTabIds = currentTabItems.map(item => item.id);
      setSelectedItems(prev => prev.filter(id => !currentTabIds.includes(id)));
    }
  };

  const isRowExpanded = (id: string) => expandedRows.includes(id);
  const isItemSelected = (id: string) => selectedItems.includes(id);

  const handleCreateClick = () => {
    setSidebarType('create');
    setSidebarOpen(true);
  };

  const handleEditClick = (item: Tool | Material) => {
    console.log('Edit item clicked:', item);

    // Ensure we have complete data for editing
    let editItemData = item;

    // If item comes from selectedItemsData, find the complete data from original arrays
    if (selectedItems.includes(item.id)) {
      const completeItem = allItems.find(originalItem => originalItem.id === item.id);
      if (completeItem) {
        editItemData = completeItem;
      }
    }

    console.log('Edit item data:', editItemData);
    setEditItem(editItemData);
    setSidebarType('edit');
    setSidebarOpen(true);
  };

  const handleProcessClick = () => {
    console.log('Process button clicked');
    console.log('Selected items data:', selectedItemsData);
    console.log('Selected tools with units:', selectedItemsData.filter(item => item.type === 'tool'));
    setSidebarType('process');
    setSidebarOpen(true);
  };

  const handleDeleteClick = () => {
    setSidebarType('delete');
    setSidebarOpen(true);
  };

  const handleFormSubmit = async (formData: FormData) => {
    try {
      // Show loading with appropriate message
      if (sidebarType === 'create') {
        showLoading('Creating items...');
      } else if (sidebarType === 'edit') {
        showLoading('Updating item...');
      } else if (sidebarType === 'process') {
        const hasTools = selectedItemsData.filter(item => item.type === 'tool').length > 0;
        const hasMaterials = selectedItemsData.filter(item => item.type === 'material').length > 0;
        if (hasTools && hasMaterials) {
          showLoading('Processing mixed transaction...');
        } else if (hasTools) {
          showLoading('Processing borrowing transaction...');
        } else {
          showLoading('Processing consumption transaction...');
        }
      } else if (sidebarType === 'delete') {
        showLoading('Deleting items...');
      }
      
      let response, result;
      // CREATE
      if (sidebarType === 'create') {
        // Pisahkan tools dan materials jika mixed
        const toolsToCreate = (formData.items as Record<string, unknown>[] || []).filter((item) => item.type === 'tool');
        const materialsToCreate = (formData.items as Record<string, unknown>[] || []).filter((item) => item.type === 'material');

        // Helper untuk mapping category name ke ID jika perlu
        // Asumsi: formData.categories adalah array kategori { id, name }
        // Gunakan state categories yang sudah di-fetch
        const getCategoryId = (category: unknown, type: 'TOOL' | 'MATERIAL') => {
          if (typeof category === 'string' && category.match(/^\w{8,}$/)) return category; // sudah ID
          const found = categories.find((cat) => cat.name === category && cat.type === type);
          return found ? found.id : category;
        };

        // Helper untuk mapping payload agar sesuai backend
        const mapToolPayload = (item: Record<string, unknown>) => ({
          name: item.name as string,
          categoryId: getCategoryId(item.category, 'TOOL'),
          totalQuantity: item.quantity as number,
          availableQuantity: item.quantity as number, // wajib dikirim, default sama dengan total
          condition: (item.condition ? (item.condition as string).toUpperCase() : 'GOOD'), // enum huruf besar
          location: item.location as string || '',
          supplier: item.supplier as string || ''
        });
        const mapMaterialPayload = (item: Record<string, unknown>) => ({
          name: item.name as string,
          categoryId: getCategoryId(item.category, 'MATERIAL'),
          currentQuantity: item.quantity as number,
          thresholdQuantity: item.threshold as number || 0,
          unit: item.unit as string || '',
          location: item.location as string || '',
          supplier: item.supplier as string || ''
        });
        
        // Kirim satu per satu agar error lebih jelas
        for (const tool of toolsToCreate) {
          response = await fetch('/api/tools', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mapToolPayload(tool))
          });
          result = await response.json();
          if (!result.success) throw new Error(result.message || 'Failed to create tool');
        }
        for (const material of materialsToCreate) {
          response = await fetch('/api/materials', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mapMaterialPayload(material))
          });
          result = await response.json();
          if (!result.success) throw new Error(result.message || 'Failed to create material');
        }
        
        // Show success toast for create
        const totalCreated = toolsToCreate.length + materialsToCreate.length;
        toast({
          type: 'success',
          title: 'Items Created Successfully',
          description: `Successfully created ${totalCreated} item${totalCreated > 1 ? 's' : ''}`
        });
      }
      // PROCESS (BORROW/CONSUME)
      else if (sidebarType === 'process') {
        console.log('Processing transaction:', formData);
        if (!formData.type) {
          throw new Error('Transaction type is required');
        }

        if (formData.type === 'borrow') {
          // --- BORROW ---
          const borrowPayload = {
            borrowerName: formData.borrowerName,
            dueDate: new Date(formData.dueDate as string).toISOString(),
            purpose: formData.purpose,
            notes: formData.notes,
            items: formData.items
          };
          console.log('Sending borrow payload:', borrowPayload);
          try {
            response = await fetch('/api/borrowings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(borrowPayload)
            });
            result = await response.json();
            if (!response.ok || !result.success) {
              throw new Error(result.error || result.message || 'Failed to process borrowing');
            }
            toast({
              type: 'success',
              title: 'Borrowing Processed',
              description: `Successfully processed borrowing for ${formData.borrowerName}`
            });
          } catch (error) {
            console.error('Borrowing error:', error);
            throw new Error(error instanceof Error ? error.message : 'Failed to process borrowing');
          }
        } else if (formData.type === 'consume') {
          // --- CONSUME ---
          const consumePayload = {
            consumerName: formData.consumerName,
            purpose: formData.purpose,
            projectName: formData.projectName,
            notes: formData.notes,
            items: formData.items
          };
          console.log('Sending consume payload:', consumePayload);
          try {
            response = await fetch('/api/consumptions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(consumePayload)
            });
            result = await response.json();
            if (!response.ok || !result.success) {
              throw new Error(result.error || result.message || 'Failed to process consumption');
            }
            toast({
              type: 'success',
              title: 'Consumption Processed',
              description: `Successfully processed consumption for ${formData.consumerName}`
            });
          } catch (error) {
            console.error('Consumption error:', error);
            throw new Error(error instanceof Error ? error.message : 'Failed to process consumption');
          }
        } else if (formData.type === 'mixed') {
          // --- MIXED (parallel) ---
          console.log('Processing mixed transaction...');
          try {
            const [borrowRes, consumeRes] = await Promise.all([
              fetch('/api/borrowings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData.borrow)
              }),
              fetch('/api/consumptions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData.consume)
              })
            ]);

            const [borrowResult, consumeResult] = await Promise.all([
              borrowRes.json(),
              consumeRes.json()
            ]);

            if (!borrowRes.ok || !borrowResult.success) {
              throw new Error(borrowResult.error || borrowResult.message || 'Failed to process borrowing');
            }

            if (!consumeRes.ok || !consumeResult.success) {
              throw new Error(consumeResult.error || consumeResult.message || 'Failed to process consumption');
            }

            toast({
              type: 'success',
              title: 'Mixed Transaction Processed',
              description: 'Successfully processed borrowing and consumption'
            });
          } catch (error) {
            console.error('Mixed transaction error:', error);
            throw new Error(error instanceof Error ? error.message : 'Failed to process mixed transaction');
          }
        }
      }
      // EDIT
      else if (sidebarType === 'edit') {
        // Determine type from current editing item
        const isTool = editItem?.type === 'tool';

        // Build payload from provided fields; only include quantities if present
        interface EditFormData {
          name?: string;
          category?: string;
          location?: string;
          supplier?: string;
          unit?: string;
          totalQuantity?: number;
          availableQuantity?: number;
          currentQuantity?: number;
          thresholdQuantity?: number;
          id?: string;
        }
        
        const typedFormData = formData as EditFormData;
        const base: Record<string, unknown> = {
          name: typedFormData.name,
          categoryId: typedFormData.category,
          location: typedFormData.location || undefined,
          supplier: typedFormData.supplier || undefined,
          unit: !isTool ? typedFormData.unit : undefined,
        };
        if (isTool) {
          if (typedFormData.totalQuantity !== undefined) {
            base.totalQuantity = Number(typedFormData.totalQuantity);
          }
          if (typedFormData.availableQuantity !== undefined) {
            base.availableQuantity = Number(typedFormData.availableQuantity);
          }
        } else {
          if (typedFormData.currentQuantity !== undefined) {
            base.currentQuantity = Number(typedFormData.currentQuantity);
          }
          if (typedFormData.thresholdQuantity !== undefined) {
            base.thresholdQuantity = Number(typedFormData.thresholdQuantity);
          }
        }

        const endpoint = isTool ? `/api/tools/${typedFormData.id}` : `/api/materials/${typedFormData.id}`;
        response = await fetch(endpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(base)
        });
        result = await response.json();
        if (!result.success) throw new Error(result.message || 'Failed to update item');
        
        // Show success toast for edit
        toast({
          type: 'success',
          title: 'Item Updated',
          description: `Successfully updated ${formData.name}`
        });
      }
      // DELETE
      else if (sidebarType === 'delete') {
        // Hapus satu per satu agar aman
        for (const item of (Array.isArray(formData.items) ? formData.items : [])) {
          const endpoint = item.type === 'tool' ? `/api/tools/${item.id}` : `/api/materials/${item.id}`;
          response = await fetch(endpoint, { method: 'DELETE' });
          result = await response.json();
          if (!result.success) throw new Error(result.message || `Failed to delete ${item.name}`);
        }
        
        // Show success toast for delete
        const itemCount = Array.isArray(formData.items) ? formData.items.length : 0;
        toast({
          type: 'success',
          title: 'Items Deleted',
          description: `Successfully deleted ${itemCount} item${itemCount > 1 ? 's' : ''}`
        });
      }
      // Tambahkan aksi lain (process) jika dibutuhkan
      // Refresh data
      setSidebarOpen(false);
      setSelectedItems([]);
      // Panggil ulang data (keep current search, but no full-page loading)
      setIsSearching(true);
      const [toolsData, materialsData] = await Promise.all([
        fetchTools(searchQuery),
        fetchMaterials(searchQuery)
      ]);
      hideLoading();
      setTools(toolsData);
      setMaterials(materialsData);
      setIsSearching(false);
    } catch (error) {
      hideLoading();
      const errorMessage = error instanceof Error ? error.message : 'Operation failed';
      toast({
        type: 'error',
        title: 'Operation Failed',
        description: errorMessage
      });
      console.error('Inventory CRUD error:', error);
    }
  };

  const getProcessButtonText = () => {
    if (hasMixed) return 'Process Mixed';
    if (hasTools) return 'Borrow Tools';
    if (hasMaterials) return 'Consume Materials';
    return 'Process';
  };

  const canDeleteItems = () => {
    return selectedItemsData.every(item => !item.hasActiveBorrowing);
  };

  // Check if all items in current tab are selected
  // Pagination helpers
  const totalToolPages = Math.max(1, Math.ceil(tools.length / pageSize));
  const totalMaterialPages = Math.max(1, Math.ceil(materials.length / pageSize));
  const paginatedTools = tools.slice((toolPage - 1) * pageSize, toolPage * pageSize);
  const paginatedMaterials = materials.slice((materialPage - 1) * pageSize, materialPage * pageSize);

  // Selection helpers should operate on current page items only
  const currentTabItems = activeTab === 'tools' ? paginatedTools : paginatedMaterials;
  const currentTabIds = currentTabItems.map(item => item.id);
  const isAllSelected = currentTabIds.length > 0 && currentTabIds.every(id => selectedItems.includes(id));
  const isSomeSelected = currentTabIds.some(id => selectedItems.includes(id));

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Tools & Materials</h1>
            <p className="text-muted-foreground mt-1">Loading inventory data...</p>
          </div>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Tools & Materials</h1>
          <p className="text-muted-foreground mt-1">
            Manage your inventory with advanced filtering and bulk operations
          </p>
        </div>
        <div className="flex space-x-2">
          <Button className="hover-lift" onClick={handleCreateClick}>
            <Plus className="w-4 h-4 mr-2" />
            Create Item
          </Button>
        </div>
      </div>

      {/* Search */}
          <div className="glass rounded-xl p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari alat dan material..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Searching...</div>
            )}
          </div>
        </div>
      </div>

      {/* Smart Floating Action Box */}
      {selectedItems.length > 0 && (
        typeof window !== 'undefined' &&
        createPortal(
        <div className="fixed bottom-6 right-6 glass rounded-xl p-4 shadow-2xl z-40 transition-all-smooth border border-white/20">
          <div className="flex items-center space-x-4">
            <div className="text-sm">
              <div className="font-medium">
                {selectedItems.length} item{selectedItems.length > 1 ? 's' : ''} selected
              </div>
              <div className="text-xs text-muted-foreground">
                {hasTools && hasMaterials && `${selectedTools.length} tools, ${selectedMaterials.length} materials`}
                {hasTools && !hasMaterials && `${selectedTools.length} tool${selectedTools.length > 1 ? 's' : ''}`}
                {!hasTools && hasMaterials && `${selectedMaterials.length} material${selectedMaterials.length > 1 ? 's' : ''}`}
              </div>
            </div>
            <div className="flex space-x-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedItems([])}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  // Get the complete item data from original arrays
                  const completeItem = allItems.find(item => item.id === selectedItems[0]);
                  if (completeItem) {
                    handleEditClick(completeItem);
                  }
                }}
                disabled={selectedItems.length !== 1}
              >
                <Edit className="w-4 h-4 mr-1" />
                Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDeleteClick}
                disabled={!canDeleteItems()}
                className={cn(!canDeleteItems() && "opacity-50 cursor-not-allowed")}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Delete
                {!canDeleteItems() && <AlertTriangle className="w-3 h-3 ml-1 text-amber-500" />}
              </Button>
              <Button size="sm" onClick={handleProcessClick}>
                <FileText className="w-4 h-4 mr-1" />
                {getProcessButtonText()}
              </Button>
            </div>
          </div>
        </div>,
        document.body
        )
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="glass">
          <TabsTrigger value="tools" className="flex items-center space-x-2">
            <Wrench className="w-4 h-4" />
            <span>Tools</span>
            <Badge variant="secondary" className="ml-1">{tools.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="materials" className="flex items-center space-x-2">
            <Package className="w-4 h-4" />
            <span>Materials</span>
            <Badge variant="secondary" className="ml-1">{materials.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tools" className="space-y-4">
          <div className="glass rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/50">
                  <tr>
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={isAllSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = isSomeSelected && !isAllSelected;
                        }}
                        onChange={(e) => selectAllItems(e.target.checked)}
                      />
                    </th>
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">ID</th>
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">Name</th>
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">Category</th>
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">Condition</th>
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">Available/Total</th>
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">Actions</th>
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground"></th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTools.map((tool) => (
                    <React.Fragment key={tool.id}>
                      <tr
                        className="border-b border-gray-100 hover:bg-white/50 cursor-pointer transition-all-smooth"
                        onClick={() => toggleRowExpansion(tool.id)}
                      >
                        <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="rounded"
                            checked={isItemSelected(tool.id)}
                            onChange={() => toggleItemSelection(tool.id)}
                          />
                        </td>
                        <td className="py-4 px-4 text-sm font-mono">
                          {tool.displayId || tool.id.slice(0, 8) + '...'}
                        </td>
                        <td className="py-4 px-4 text-sm font-medium">{tool.name}</td>
                        <td className="py-4 px-4 text-sm capitalize">{tool.category.name}</td>
                        <td className="py-4 px-4">
                          <div className="flex flex-col space-y-2">
                            {tool.units && tool.units.length > 0 ? (
                              <>
                                {/* Condition Progress Bar */}
                                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden flex shadow-inner">
                                  <div
                                    className="h-full bg-gradient-to-r from-green-400 to-green-500 transition-all duration-300"
                                    style={{ width: `${(tool.units.filter(u => u.condition === 'EXCELLENT').length / tool.units.length) * 100}%` }}
                                  />
                                  <div
                                    className="h-full bg-gradient-to-r from-blue-400 to-blue-500 transition-all duration-300"
                                    style={{ width: `${(tool.units.filter(u => u.condition === 'GOOD').length / tool.units.length) * 100}%` }}
                                  />
                                  <div
                                    className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 transition-all duration-300"
                                    style={{ width: `${(tool.units.filter(u => u.condition === 'FAIR').length / tool.units.length) * 100}%` }}
                                  />
                                  <div
                                    className="h-full bg-gradient-to-r from-red-400 to-red-500 transition-all duration-300"
                                    style={{ width: `${(tool.units.filter(u => u.condition === 'POOR').length / tool.units.length) * 100}%` }}
                                  />
                                </div>

                                {/* Condition Count Labels */}
                                <div className="flex justify-between items-center text-xs">
                                  <div className="flex items-center space-x-1" title="Excellent">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span className="font-medium text-green-700">
                                      {tool.units.filter(u => u.condition === 'EXCELLENT').length}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-1" title="Good">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    <span className="font-medium text-blue-700">
                                      {tool.units.filter(u => u.condition === 'GOOD').length}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-1" title="Fair">
                                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                    <span className="font-medium text-yellow-700">
                                      {tool.units.filter(u => u.condition === 'FAIR').length}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-1" title="Poor">
                                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                    <span className="font-medium text-red-700">
                                      {tool.units.filter(u => u.condition === 'POOR').length}
                                    </span>
                                  </div>
                                </div>
                              </>
                            ) : (
                              <div className="text-center py-2">
                                <span className="text-xs text-gray-400 italic">No units data</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-sm">
                          <span className="font-medium">{tool.availableQuantity}</span>
                          <span className="text-muted-foreground">/{tool.totalQuantity}</span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-2">
                            {tool.hasActiveBorrowing ? (
                              <AlertTriangle className="w-4 h-4 text-amber-500" />
                            ) : (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            )}
                            <Badge className={cn(
                              "text-xs",
                              tool.hasActiveBorrowing
                                ? "bg-amber-100 text-amber-800 border-amber-200"
                                : "bg-green-100 text-green-800 border-green-200"
                            )}>
                              {tool.hasActiveBorrowing ? 'In Use' : 'Available'}
                            </Badge>
                          </div>
                        </td>
                        <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditClick(tool)}
                            className="hover-lift"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                        </td>
                        <td className="py-4 px-4">
                          {isRowExpanded(tool.id) ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          )}
                        </td>
                      </tr>
                      {isRowExpanded(tool.id) && (
                        <tr>
                          <td colSpan={9} className="py-6 px-6 bg-gradient-to-r from-gray-50/80 to-blue-50/30 border-t border-gray-200">
                            <div className="max-w-6xl mx-auto">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                                {/* Details Section */}
                                <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 hover:border-blue-200">
                                  <div className="flex items-center mb-3">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
                                    <h4 className="font-semibold text-gray-800">Details</h4>
                                  </div>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex justify-between items-center py-1">
                                      <span className="text-gray-600">Created:</span>
                                      <span className="font-medium text-gray-800">
                                        {new Date(tool.createdAt).toLocaleDateString()}
                                      </span>
                                    </div>
                                    <div className="flex justify-between items-center py-1">
                                      <span className="text-gray-600">Location:</span>
                                      <span className="font-medium text-gray-800">
                                        {tool.location || 'Not specified'}
                                      </span>
                                    </div>
                                    <div className="flex justify-between items-center py-1">
                                      <span className="text-gray-600">Supplier:</span>
                                      <span className="font-medium text-gray-800">
                                        {tool.supplier || 'Not specified'}
                                      </span>
                                    </div>
                                    <div className="flex justify-between items-center py-1">
                                      <span className="text-gray-600">Last Updated:</span>
                                      <span className="font-medium text-gray-800">
                                        {new Date(tool.updatedAt).toLocaleDateString()}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Activity History Section */}
                                <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 hover:border-green-200">
                                  <div className="flex items-center mb-3">
                                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                                    <h4 className="font-semibold text-gray-800">Activity History</h4>
                                  </div>
                                  <div className="space-y-2 text-sm">
                                    {tool.hasActiveBorrowing ? (
                                      <>
                                        <div className="flex items-center justify-between py-1">
                                          <span className="text-gray-600">Status:</span>
                                          <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                                            Active Borrowing
                                          </Badge>
                                        </div>
                                        <div className="flex justify-between items-center py-1">
                                          <span className="text-gray-600">Borrowed:</span>
                                          <span className="font-medium text-amber-600">
                                            {tool.borrowedQuantity} units
                                          </span>
                                        </div>
                                        <div className="flex justify-between items-center py-1">
                                          <span className="text-gray-600">Available:</span>
                                          <span className="font-medium text-green-600">
                                            {tool.availableQuantity} units
                                          </span>
                                        </div>
                                      </>
                                    ) : (
                                      <>
                                        <div className="flex items-center justify-between py-1">
                                          <span className="text-gray-600">Status:</span>
                                          <Badge className="bg-green-100 text-green-800 border-green-200">
                                            Ready for Use
                                          </Badge>
                                        </div>
                                        <div className="flex justify-between items-center py-1">
                                          <span className="text-gray-600">Available:</span>
                                          <span className="font-medium text-green-600">
                                            All {tool.availableQuantity} units
                                          </span>
                                        </div>
                                        <div className="text-center py-2 text-gray-500 italic">
                                          No active borrowings
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>

                                {/* Condition Distribution Section */}
                                <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 hover:border-purple-200">
                                  <div className="flex items-center mb-3">
                                    <div className="w-2 h-2 bg-purple-500 rounded-full mr-2 animate-pulse"></div>
                                    <h4 className="font-semibold text-gray-800">Condition Distribution</h4>
                                  </div>

                                  {tool.units && tool.units.length > 0 ? (
                                    <div className="space-y-3">
                                      {/* Condition Breakdown */}
                                      <div className="space-y-2">
                                        {[
                                          { condition: 'EXCELLENT', label: 'Excellent', color: 'bg-green-500', textColor: 'text-green-700' },
                                          { condition: 'GOOD', label: 'Good', color: 'bg-blue-500', textColor: 'text-blue-700' },
                                          { condition: 'FAIR', label: 'Fair', color: 'bg-yellow-500', textColor: 'text-yellow-700' },
                                          { condition: 'POOR', label: 'Poor', color: 'bg-red-500', textColor: 'text-red-700' }
                                        ].map(({ condition, label, color, textColor }) => {
                                          const count = tool.units?.filter(u => u.condition === condition).length || 0;
                                          const percentage = tool.units ? (count / tool.units.length) * 100 : 0;
                                          return (
                                            <div key={condition} className="flex items-center justify-between">
                                              <div className="flex items-center space-x-2">
                                                <div className={`w-3 h-3 rounded-full ${color}`}></div>
                                                <span className="text-sm text-gray-600">{label}:</span>
                                              </div>
                                              <div className="flex items-center space-x-2">
                                                <span className={`text-sm font-medium ${textColor}`}>
                                                  {count}
                                                </span>
                                                <span className="text-xs text-gray-400">
                                                  ({percentage.toFixed(0)}%)
                                                </span>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>

                                      {/* Summary */}
                                      <div className="border-t pt-2 mt-3 space-y-1">
                                        <div className="flex justify-between items-center text-sm">
                                          <span className="text-gray-600">Total Quantity:</span>
                                          <span className="font-semibold text-gray-800">{tool.totalQuantity}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                          <span className="text-gray-600">Available:</span>
                                          <span className="font-semibold text-green-600">{tool.availableQuantity}</span>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-center py-4 text-gray-500 italic">
                                      No units data available
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                  {tools.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground">
                        No tools found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination Controls */}
            <div className="flex items-center justify-between p-4 border-t bg-white/50">
              <div className="text-sm text-muted-foreground">
                Showing {(tools.length === 0) ? 0 : ((toolPage - 1) * pageSize + 1)}-
                {Math.min(toolPage * pageSize, tools.length)} of {tools.length}
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" disabled={toolPage === 1} onClick={() => setToolPage(p => Math.max(1, p - 1))}>Prev</Button>
                <div className="text-sm">Page {toolPage} / {totalToolPages}</div>
                <Button variant="outline" size="sm" disabled={toolPage === totalToolPages} onClick={() => setToolPage(p => Math.min(totalToolPages, p + 1))}>Next</Button>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="materials" className="space-y-4">
          <div className="glass rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/50">
                  <tr>
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={isAllSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = isSomeSelected && !isAllSelected;
                        }}
                        onChange={(e) => selectAllItems(e.target.checked)}
                      />
                    </th>
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">ID</th>
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">Name</th>
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">Category</th>
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">Quantity</th>
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">Unit</th>
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">Threshold</th>
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">Actions</th>
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground"></th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedMaterials.map((material) => (
                    <React.Fragment key={material.id}>
                      <tr
                        className="border-b border-gray-100 hover:bg-white/50 cursor-pointer transition-all-smooth"
                        onClick={() => toggleRowExpansion(material.id)}
                      >
                        <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="rounded"
                            checked={isItemSelected(material.id)}
                            onChange={() => toggleItemSelection(material.id)}
                          />
                        </td>
                        <td className="py-4 px-4 text-sm font-mono">
                          {material.displayId || material.id.slice(0, 8) + '...'}
                        </td>
                        <td className="py-4 px-4 text-sm font-medium">{material.name}</td>
                        <td className="py-4 px-4 text-sm capitalize">{material.category.name}</td>
                        <td className="py-4 px-4 text-sm font-medium">
                          <span className={material.currentQuantity <= material.thresholdQuantity ? "text-red-500" : ""}>
                            {material.currentQuantity}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-sm">{material.unit}</td>
                        <td className="py-4 px-4 text-sm text-muted-foreground">{material.thresholdQuantity}</td>
                        <td className="py-4 px-4">
                          <Badge className={cn(
                            "text-xs",
                            material.stockStatus === 'out' ? "bg-red-100 text-red-800 border-red-200" :
                            material.stockStatus === 'low' ? "bg-yellow-100 text-yellow-800 border-yellow-200" :
                            "bg-green-100 text-green-800 border-green-200"
                          )}>
                            {material.stockStatus === 'out' ? 'Out of Stock' :
                             material.stockStatus === 'low' ? 'Low Stock' : 'In Stock'}
                          </Badge>
                        </td>
                        <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditClick(material)}
                            className="hover-lift"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                        </td>
                        <td className="py-4 px-4">
                          {isRowExpanded(material.id) ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          )}
                        </td>
                      </tr>
                      {isRowExpanded(material.id) && (
                        <tr>
                          <td colSpan={10} className="py-6 px-6 bg-gradient-to-r from-gray-50/80 to-purple-50/30 border-t border-gray-200">
                            <div className="max-w-6xl mx-auto">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                                {/* Details Section */}
                                <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 hover:border-blue-200">
                                  <div className="flex items-center mb-3">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
                                    <h4 className="font-semibold text-gray-800">Details</h4>
                                  </div>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex justify-between items-center py-1">
                                      <span className="text-gray-600">Created:</span>
                                      <span className="font-medium text-gray-800">
                                        {new Date(material.createdAt).toLocaleDateString()}
                                      </span>
                                    </div>
                                    <div className="flex justify-between items-center py-1">
                                      <span className="text-gray-600">Storage:</span>
                                      <span className="font-medium text-gray-800">
                                        {material.location || 'Not specified'}
                                      </span>
                                    </div>
                                    <div className="flex justify-between items-center py-1">
                                      <span className="text-gray-600">Supplier:</span>
                                      <span className="font-medium text-gray-800">
                                        {material.supplier || 'Not specified'}
                                      </span>
                                    </div>
                                    <div className="flex justify-between items-center py-1">
                                      <span className="text-gray-600">Last Updated:</span>
                                      <span className="font-medium text-gray-800">
                                        {new Date(material.updatedAt).toLocaleDateString()}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Consumption History Section */}
                                <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 hover:border-purple-200">
                                  <div className="flex items-center mb-3">
                                    <div className="w-2 h-2 bg-purple-500 rounded-full mr-2 animate-pulse"></div>
                                    <h4 className="font-semibold text-gray-800">Consumption History</h4>
                                  </div>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex items-center justify-between py-1">
                                      <span className="text-gray-600">Stock Status:</span>
                                      <Badge className={cn(
                                        material.stockStatus === 'out' ? "bg-red-100 text-red-800 border-red-200" :
                                        material.stockStatus === 'low' ? "bg-yellow-100 text-yellow-800 border-yellow-200" :
                                        "bg-green-100 text-green-800 border-green-200"
                                      )}>
                                        {material.stockStatus === 'out' ? 'Out of Stock' :
                                         material.stockStatus === 'low' ? 'Low Stock' : 'In Stock'}
                                      </Badge>
                                    </div>
                                    <div className="flex justify-between items-center py-1">
                                      <span className="text-gray-600">Low Stock Alert:</span>
                                      <span className={`font-medium ${material.isLowStock ? 'text-red-600' : 'text-green-600'}`}>
                                        {material.isLowStock ? 'Yes' : 'No'}
                                      </span>
                                    </div>
                                    <div className="flex justify-between items-center py-1">
                                      <span className="text-gray-600">Unit:</span>
                                      <span className="font-medium text-gray-800">{material.unit}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Stock Status Section */}
                                <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 hover:border-green-200">
                                  <div className="flex items-center mb-3">
                                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                                    <h4 className="font-semibold text-gray-800">Stock Status</h4>
                                  </div>
                                  <div className="space-y-3">
                                    {/* Stock Progress Bar */}
                                    <div className="space-y-2">
                                      <div className="flex justify-between text-xs text-gray-600">
                                        <span>Current Stock</span>
                                        <span>{((material.currentQuantity / (material.thresholdQuantity * 2)) * 100).toFixed(0)}%</span>
                                      </div>
                                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                          className={`h-full transition-all duration-300 ${
                                            material.stockStatus === 'out' ? 'bg-red-500' :
                                            material.stockStatus === 'low' ? 'bg-yellow-500' :
                                            'bg-green-500'
                                          }`}
                                          style={{
                                            width: `${Math.min(100, (material.currentQuantity / (material.thresholdQuantity * 2)) * 100)}%`
                                          }}
                                        />
                                      </div>
                                    </div>

                                    {/* Stock Details */}
                                    <div className="space-y-1 text-sm">
                                      <div className="flex justify-between items-center py-1">
                                        <span className="text-gray-600">Current:</span>
                                        <span className="font-semibold text-gray-800">
                                          {material.currentQuantity} {material.unit}
                                        </span>
                                      </div>
                                      <div className="flex justify-between items-center py-1">
                                        <span className="text-gray-600">Threshold:</span>
                                        <span className="font-semibold text-yellow-600">
                                          {material.thresholdQuantity} {material.unit}
                                        </span>
                                      </div>
                                      <div className="flex justify-between items-center py-1">
                                        <span className="text-gray-600">Remaining:</span>
                                        <span className={`font-semibold ${
                                          material.currentQuantity <= material.thresholdQuantity ? 'text-red-600' : 'text-green-600'
                                        }`}>
                                          {Math.max(0, material.currentQuantity - material.thresholdQuantity)} {material.unit}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                  {materials.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-muted-foreground">
                        No materials found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination Controls */}
            <div className="flex items-center justify-between p-4 border-t bg-white/50">
              <div className="text-sm text-muted-foreground">
                Showing {(materials.length === 0) ? 0 : ((materialPage - 1) * pageSize + 1)}-
                {Math.min(materialPage * pageSize, materials.length)} of {materials.length}
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" disabled={materialPage === 1} onClick={() => setMaterialPage(p => Math.max(1, p - 1))}>Prev</Button>
                <div className="text-sm">Page {materialPage} / {totalMaterialPages}</div>
                <Button variant="outline" size="sm" disabled={materialPage === totalMaterialPages} onClick={() => setMaterialPage(p => Math.min(totalMaterialPages, p + 1))}>Next</Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Contextual Sidebar */}
      <InventorySidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        type={sidebarType}
        selectedItems={selectedItemsData}
        editItem={editItem ? {
          id: editItem.id,
          name: editItem.name,
          type: editItem.type,
          category: editItem.category.id,
          quantity: editItem.type === 'tool' ? editItem.totalQuantity : editItem.currentQuantity,
          unit: editItem.type === 'material' ? editItem.unit : undefined,
          condition: undefined,
          units: editItem.type === 'tool' ? editItem.units : undefined,
          available: editItem.type === 'tool' ? editItem.availableQuantity : editItem.currentQuantity,
          total: editItem.type === 'tool' ? editItem.totalQuantity : undefined,
          totalQuantity: editItem.type === 'tool' ? editItem.totalQuantity : undefined,
          threshold: editItem.type === 'material' ? editItem.thresholdQuantity : undefined,
          supplier: editItem.supplier,
          location: editItem.location,
        } as InventoryItem : undefined}
        onSubmit={handleFormSubmit as (formData: unknown) => void}
        toolCategories={toolCategories}
        materialCategories={materialCategories}
      />
    </div>
  );
}