'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { InventorySidebar } from '@/components/ui/inventory-sidebar';
import { cn } from '@/lib/utils';
import {
  Package,
  Wrench,
  Search,
  Filter,
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
interface Tool {
  id: string;
  name: string;
  type: 'tool';
  category: {
    name: string;
    type: string;
  };
  condition: string;
  totalQuantity: number;
  availableQuantity: number;
  hasActiveBorrowing: boolean;
  borrowedQuantity: number;
  location?: string;
  supplier?: string;
  createdAt: string;
  updatedAt: string;
}

interface Material {
  id: string;
  name: string;
  type: 'material';
  category: {
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
  hasActiveBorrowing?: boolean;
}

// API functions
const fetchTools = async (searchQuery: string = ''): Promise<Tool[]> => {
  try {
    const params = new URLSearchParams();
    if (searchQuery) params.append('search', searchQuery);

    const response = await fetch(`/api/tools?${params.toString()}`);
    const result = await response.json();

    if (result.success) {
      return result.data.map((tool: any) => ({
        ...tool,
        type: 'tool' as const
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
    const result = await response.json();

    if (result.success) {
      return result.data.map((material: any) => ({
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
const getConditionColor = (condition: string) => {
  switch (condition.toLowerCase()) {
    case 'excellent': return 'bg-green-100 text-green-800 border-green-200';
    case 'good': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'fair': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'poor': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export default function Inventory() {
  const [activeTab, setActiveTab] = useState("tools");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarType, setSidebarType] = useState<'create' | 'edit' | 'process' | 'delete'>('create');
  const [editItem, setEditItem] = useState<any>(null);
  const [tools, setTools] = useState<Tool[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);

  const allItems = [...tools, ...materials];
  const selectedItemsData: SelectedItem[] = allItems
    .filter(item => selectedItems.includes(item.id))
    .map(item => ({
      id: item.id,
      name: item.name,
      type: item.type,
      category: item.category.name,
      hasActiveBorrowing: 'hasActiveBorrowing' in item ? item.hasActiveBorrowing : false
    }));

  // Load data on component mount and search change
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [toolsData, materialsData] = await Promise.all([
          fetchTools(searchQuery),
          fetchMaterials(searchQuery)
        ]);

        setTools(toolsData);
        setMaterials(materialsData);
      } catch (error) {
        console.error('Error loading inventory data:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(loadData, 300); // Debounce search
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

  const handleEditClick = (item: any) => {
    setEditItem(item);
    setSidebarType('edit');
    setSidebarOpen(true);
  };

  const handleProcessClick = () => {
    setSidebarType('process');
    setSidebarOpen(true);
  };

  const handleDeleteClick = () => {
    setSidebarType('delete');
    setSidebarOpen(true);
  };

  const handleFormSubmit = async (formData: any) => {
    try {
      let response, result;
      // CREATE
      if (sidebarType === 'create') {
        // Pisahkan tools dan materials jika mixed
        const toolsToCreate = (formData.items || []).filter((item: any) => item.type === 'tool');
        const materialsToCreate = (formData.items || []).filter((item: any) => item.type === 'material');
        // Helper untuk mapping payload agar sesuai backend
        const mapToolPayload = (item: any) => ({
          name: item.name,
          categoryId: item.category, // diasumsikan category adalah id, jika bukan, perlu mapping
          totalQuantity: item.quantity,
          condition: item.condition || 'good',
          location: item.location || '',
          supplier: item.supplier || ''
        });
        const mapMaterialPayload = (item: any) => ({
          name: item.name,
          categoryId: item.category, // diasumsikan category adalah id, jika bukan, perlu mapping
          currentQuantity: item.quantity,
          thresholdQuantity: item.threshold || 0,
          unit: item.unit || '',
          location: item.location || '',
          supplier: item.supplier || ''
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
      }
      // EDIT
      else if (sidebarType === 'edit') {
        const isTool = formData.type === 'tool';
        const endpoint = isTool ? `/api/tools/${formData.id}` : `/api/materials/${formData.id}`;
        response = await fetch(endpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        result = await response.json();
        if (!result.success) throw new Error(result.message || 'Failed to update item');
      }
      // DELETE
      else if (sidebarType === 'delete') {
        // Hapus satu per satu agar aman
        for (const item of formData.items || []) {
          const endpoint = item.type === 'tool' ? `/api/tools/${item.id}` : `/api/materials/${item.id}`;
          response = await fetch(endpoint, { method: 'DELETE' });
          result = await response.json();
          if (!result.success) throw new Error(result.message || `Failed to delete ${item.name}`);
        }
      }
      // Tambahkan aksi lain (process) jika dibutuhkan
      // Refresh data
      setSidebarOpen(false);
      setSelectedItems([]);
      // Panggil ulang data
      const [toolsData, materialsData] = await Promise.all([
        fetchTools(searchQuery),
        fetchMaterials(searchQuery)
      ]);
      setTools(toolsData);
      setMaterials(materialsData);
    } catch (error: any) {
      alert(error.message || 'Operation failed');
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
  const currentTabItems = activeTab === 'tools' ? tools : materials;
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
          <Button variant="outline" className="hover-lift">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
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
          </div>
        </div>
      </div>

      {/* Smart Floating Action Box */}
      {selectedItems.length > 0 && (
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
              <Button size="sm" variant="outline" onClick={() => handleEditClick(selectedItemsData[0])} disabled={selectedItems.length > 1}>
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
        </div>
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
                  {tools.map((tool) => (
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
                        <td className="py-4 px-4 text-sm font-mono">{tool.id}</td>
                        <td className="py-4 px-4 text-sm font-medium">{tool.name}</td>
                        <td className="py-4 px-4 text-sm capitalize">{tool.category.name}</td>
                        <td className="py-4 px-4">
                          <Badge className={cn("text-xs", getConditionColor(tool.condition))}>
                            {tool.condition}
                          </Badge>
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
                          <td colSpan={9} className="py-4 px-6 bg-gray-50/50">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <h4 className="font-medium text-sm mb-2">Details</h4>
                                <p className="text-sm text-muted-foreground">
                                  Created: {new Date(tool.createdAt).toLocaleDateString()}<br />
                                  Location: {tool.location || 'Not specified'}<br />
                                  Supplier: {tool.supplier || 'Not specified'}<br />
                                  Last Updated: {new Date(tool.updatedAt).toLocaleDateString()}
                                </p>
                              </div>
                              <div>
                                <h4 className="font-medium text-sm mb-2">Activity History</h4>
                                <p className="text-sm text-muted-foreground">
                                  {tool.hasActiveBorrowing ? (
                                    <>
                                      Currently borrowed: {tool.borrowedQuantity} units<br />
                                      Available: {tool.availableQuantity} units<br />
                                      Status: Active borrowing
                                    </>
                                  ) : (
                                    <>
                                      No active borrowings<br />
                                      All units available<br />
                                      Status: Ready for use
                                    </>
                                  )}
                                </p>
                              </div>
                              <div>
                                <h4 className="font-medium text-sm mb-2">Condition Distribution</h4>
                                <div className="text-sm space-y-1">
                                  <div className="flex justify-between">
                                    <span>Current Condition:</span>
                                    <Badge className={cn("text-xs", getConditionColor(tool.condition))}>
                                      {tool.condition}
                                    </Badge>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Total Quantity:</span> <span>{tool.totalQuantity}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Available:</span> <span>{tool.availableQuantity}</span>
                                  </div>
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
                  {materials.map((material) => (
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
                        <td className="py-4 px-4 text-sm font-mono">{material.id}</td>
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
                          <td colSpan={10} className="py-4 px-6 bg-gray-50/50">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <h4 className="font-medium text-sm mb-2">Details</h4>
                                <p className="text-sm text-muted-foreground">
                                  Created: {new Date(material.createdAt).toLocaleDateString()}<br />
                                  Storage: {material.location || 'Not specified'}<br />
                                  Supplier: {material.supplier || 'Not specified'}<br />
                                  Last Updated: {new Date(material.updatedAt).toLocaleDateString()}
                                </p>
                              </div>
                              <div>
                                <h4 className="font-medium text-sm mb-2">Consumption History</h4>
                                <p className="text-sm text-muted-foreground">
                                  Stock Status: {material.stockStatus}<br />
                                  Low Stock Alert: {material.isLowStock ? 'Yes' : 'No'}<br />
                                  Unit: {material.unit}
                                </p>
                              </div>
                              <div>
                                <h4 className="font-medium text-sm mb-2">Stock Status</h4>
                                <div className="text-sm space-y-1">
                                  <div className="flex justify-between">
                                    <span>Current:</span> <span>{material.currentQuantity} {material.unit}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Threshold:</span> <span>{material.thresholdQuantity} {material.unit}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Status:</span>
                                    <Badge className={cn(
                                      material.stockStatus === 'out' ? "bg-red-100 text-red-800" :
                                      material.stockStatus === 'low' ? "bg-yellow-100 text-yellow-800" :
                                      "bg-green-100 text-green-800"
                                    )}>
                                      {material.stockStatus === 'out' ? 'Out of Stock' :
                                       material.stockStatus === 'low' ? 'Low Stock' : 'In Stock'}
                                    </Badge>
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
          </div>
        </TabsContent>
      </Tabs>

      {/* Contextual Sidebar */}
      <InventorySidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        type={sidebarType}
        selectedItems={selectedItemsData}
        editItem={editItem}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}