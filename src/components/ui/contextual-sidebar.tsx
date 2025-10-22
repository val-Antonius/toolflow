import React, { useState } from 'react';
import { Button } from './button';
import { Label } from './label';
import { Textarea } from './textarea';
import { ConditionPicker } from './condition-picker';
import { DateTimePicker } from './datetime-picker';
import { useToast } from '@/hooks/use-toast';
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
  
  // Initialize hooks
  const { toast } = useToast();

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
        toast({
          type: 'error',
          title: 'Kondisi Belum Lengkap',
          description: 'Silakan tentukan kondisi untuk semua barang sebelum melanjutkan'
        });
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
        toast({
          type: 'error',
          title: 'Informasi Belum Lengkap',
          description: 'Silakan lengkapi semua kolom yang wajib diisi'
        });
        return;
      }

      // Validate new due date is in the future
      const newDueDate = new Date(formData.newDueDate);
      if (isNaN(newDueDate.getTime())) {
        toast({
          type: 'error',
          title: 'Tanggal Tidak Valid',
          description: 'Silakan masukkan tanggal yang valid'
        });
        return;
      }

      if (newDueDate <= new Date()) {
        toast({
          type: 'error',
          title: 'Tanggal Tidak Valid',
          description: 'Tanggal jatuh tempo baru harus di masa depan'
        });
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
      case 'return': return 'Pengembalian Barang';
      case 'extend': return 'Perpanjang Tanggal Jatuh Tempo';
      case 'borrow': return 'Peminjaman Barang';
      case 'consume': return 'Penggunaan Material';
      default: return 'Formulir';
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
                        <h3 className="font-semibold text-gray-900">Informasi Pengembalian</h3>
                        <p className="text-xs text-gray-600">Detail peminjam dan ringkasan pengembalian</p>
                      </div>
                    </div>
                    <div className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium",
                      new Date(borrowing.dueDate) < new Date()
                        ? "bg-red-100 text-red-700 border border-red-200"
                        : "bg-green-100 text-green-700 border border-green-200"
                    )}>
                      {new Date(borrowing.dueDate) < new Date() ? 'Terlambat' : 'Tepat Waktu'}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Borrower Details */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-sm font-medium text-gray-700">Detail Peminjam</span>
                      </div>
                      <div className="space-y-2 text-sm pl-4">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Nama:</span>
                          <span className="font-medium text-gray-900">{borrowing.borrower}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Tanggal Jatuh Tempo:</span>
                          <span className="font-medium text-gray-900">
                            {new Date(borrowing.dueDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                        <div className="pt-1">
                          <span className="text-gray-600 block mb-1">Tujuan:</span>
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
                        <span className="text-sm font-medium text-gray-700">Statistik Pengembalian</span>
                      </div>
                      <div className="space-y-2 text-sm pl-4">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Barang:</span>
                          <span className="font-semibold text-gray-900">{borrowing.items.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Unit:</span>
                          <span className="font-semibold text-gray-900">
                            {borrowing.items.reduce((sum: number, item: BorrowedItem) => sum + item.units.length, 0)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Tanggal Pinjam:</span>
                          <span className="font-medium text-gray-900">
                            {new Date(borrowing.dueDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Hari Terlambat:</span>
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
                        <h3 className="font-semibold text-gray-900">Konfigurasi Pengembalian Massal</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Atur kondisi pengembalian untuk semua barang dengan efisien
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="text-xs text-gray-500">
                          {Object.keys(itemConditions).length}/{borrowing.items.length} dikonfigurasi
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
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">Aksi Cepat</Label>
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
                          ✅ Semua Kondisi Baik
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
                          🔄 Sama Seperti Saat Dipinjam
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
                          ⭐ Semua Sangat Baik
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
                          🗑️ Hapus Semua
                        </Button>
                      </div>
                    </div>

                    {/* Individual Item Configuration */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-gray-700">Konfigurasi Barang Individual</Label>
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
                    <h3 className="font-semibold text-gray-900">Catatan Pengembalian</h3>
                    <p className="text-sm text-gray-600 mt-1">Tambahkan komentar tambahan tentang pengembalian (opsional)</p>
                  </div>
                  <div className="p-4 space-y-4">
                    {/* Quick Notes Templates */}
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">Template Cepat</Label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          'Semua barang dikembalikan dalam kondisi baik',
                          'Terlihat beberapa keausan',
                          'Barang dibersihkan sebelum dikembalikan',
                          'Tidak ada masalah selama penggunaan',
                          'Kerusakan minor dicatat'
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
                      <Label htmlFor="notes" className="text-sm font-medium text-gray-700">Catatan Tambahan</Label>
                      <Textarea
                        id="notes"
                        placeholder="Catatan tambahan tentang barang yang dikembalikan..."
                        value={formData.notes || ''}
                        onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                        className="mt-2 min-h-[80px]"
                      />
                      <div className="flex justify-between items-center mt-2">
                        <div className="text-xs text-gray-500">
                          {formData.notes?.length || 0}/500 karakter
                        </div>
                        {formData.notes && formData.notes.length > 0 && (
                          <div className="text-xs text-green-600">✓ Catatan ditambahkan</div>
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
                        <h3 className="font-semibold text-gray-900">Informasi Perpanjangan</h3>
                        <p className="text-xs text-gray-600">Detail peminjam dan tanggal jatuh tempo saat ini</p>
                      </div>
                    </div>
                    <div className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium",
                      new Date(borrowing.dueDate) < new Date()
                        ? "bg-red-100 text-red-700 border border-red-200"
                        : "bg-green-100 text-green-700 border border-green-200"
                    )}>
                      {new Date(borrowing.dueDate) < new Date()
                        ? `Terlambat ${Math.ceil((new Date().getTime() - new Date(borrowing.dueDate).getTime()) / (1000 * 60 * 60 * 24))}h`
                        : `Jatuh tempo dalam ${Math.ceil((new Date(borrowing.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}h`
                      }
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Borrower Details */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-sm font-medium text-gray-700">Detail Peminjam</span>
                      </div>
                      <div className="space-y-2 text-sm pl-4">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Nama:</span>
                          <span className="font-medium text-gray-900">{borrowing.borrower}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Barang:</span>
                          <span className="font-medium text-gray-900">{borrowing.items.length} barang</span>
                        </div>
                        <div className="pt-1">
                          <span className="text-gray-600 block mb-1">Tujuan:</span>
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
                        <span className="text-sm font-medium text-gray-700">Tanggal Jatuh Tempo Saat Ini</span>
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
                            ? `⚠️ Terlambat ${Math.ceil((new Date().getTime() - new Date(borrowing.dueDate).getTime()) / (1000 * 60 * 60 * 24))} hari`
                            : `✅ Jatuh tempo dalam ${Math.ceil((new Date(borrowing.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} hari`
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Extension Options */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                  <div className="p-4 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900">Opsi Perpanjangan Cepat</h3>
                    <p className="text-sm text-gray-600 mt-1">Pilih periode perpanjangan preset atau atur tanggal khusus</p>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { days: 7, label: '+1 Minggu', color: 'blue' },
                        { days: 14, label: '+2 Minggu', color: 'green' },
                        { days: 30, label: '+1 Bulan', color: 'purple' },
                        { days: 60, label: '+2 Bulan', color: 'orange' }
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
                    <h3 className="font-semibold text-gray-900">Tanggal Jatuh Tempo Khusus</h3>
                    <p className="text-sm text-gray-600 mt-1">Atur tanggal dan waktu tertentu untuk perpanjangan</p>
                  </div>
                  <div className="p-4 space-y-4">
                    <div>
                      <DateTimePicker
                        id="newDueDate"
                        label="Tanggal & Waktu Jatuh Tempo Baru"
                        value={formData.newDueDate || ''}
                        onChange={(value) => setFormData((prev) => ({
                          ...prev,
                          newDueDate: value
                        }))}
                        min={new Date().toISOString().slice(0, 16)}
                        required
                        placeholder="Pilih tanggal dan waktu jatuh tempo baru"
                      />
                    </div>

                    {formData.newDueDate && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-start space-x-2">
                          <Calendar className="w-4 h-4 text-blue-600 mt-0.5" />
                          <div className="text-sm">
                            <div className="font-medium text-blue-900 mb-1">
                              📅 Tanggal jatuh tempo baru: {new Date(formData.newDueDate).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                            <div className="text-blue-700">
                              ⏱️ Periode perpanjangan: {Math.ceil((new Date(formData.newDueDate).getTime() - new Date(borrowing.dueDate).getTime()) / (1000 * 60 * 60 * 24))} hari
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
                    <h3 className="font-semibold text-gray-900">Alasan Perpanjangan</h3>
                    <p className="text-sm text-gray-600 mt-1">Berikan justifikasi yang jelas untuk permintaan perpanjangan</p>
                  </div>
                  <div className="p-4 space-y-4">
                    {/* Quick Reason Templates */}
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">Template Cepat</Label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          'Proyek tertunda',
                          'Peralatan masih digunakan',
                          'Menunggu penggantian',
                          'Periode penelitian diperpanjang',
                          'Kesulitan teknis'
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
                      <Label htmlFor="reason" className="text-sm font-medium text-gray-700">Alasan Detail</Label>
                      <Textarea
                        id="reason"
                        placeholder="Silakan berikan alasan detail untuk memperpanjang tanggal jatuh tempo..."
                        value={formData.reason || ''}
                        onChange={(e) => setFormData((prev) => ({ ...prev, reason: e.target.value }))}
                        className="mt-2 min-h-[80px]"
                        required
                      />
                      <div className="flex justify-between items-center mt-2">
                        <div className="text-xs text-gray-500">
                          {formData.reason?.length || 0}/500 karakter
                        </div>
                        {formData.reason && formData.reason.length > 0 && (
                          <div className="text-xs text-green-600">✓ Alasan diberikan</div>
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
                      <span className="font-medium text-gray-700">Progress Pengembalian</span>
                    </div>
                    <span className="font-semibold text-gray-900">
                      {Object.keys(itemConditions).length} / {borrowing.items.length} barang dikonfigurasi
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
                        Silakan konfigurasi kondisi pengembalian untuk semua barang sebelum melanjutkan
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
                      <span className="font-medium text-gray-700">Formulir Perpanjangan</span>
                    </div>
                    <span className="font-semibold text-gray-900">
                      {(formData.newDueDate && formData.reason) ? 'Lengkap' : 'Belum Lengkap'}
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
                      <span>Tanggal Jatuh Tempo Diatur</span>
                    </span>
                    <span className={cn(
                      "flex items-center space-x-1",
                      formData.reason ? "text-green-600" : "text-gray-500"
                    )}>
                      {formData.reason ? <CheckCircle className="w-3 h-3" /> : <div className="w-3 h-3 border border-gray-300 rounded-full" />}
                      <span>Alasan Diberikan</span>
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
                  Batal
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
                      Proses Pengembalian
                    </>
                  ) : (
                    <>
                      <Calendar className="w-4 h-4 mr-2" />
                      Perpanjang Tanggal Jatuh Tempo
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
