'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ContextualSidebar } from '@/components/ui/contextual-sidebar';
import { useToast } from '@/hooks/use-toast';
import { useLoading } from '@/lib/loading-context';
import { cn } from '@/lib/utils';
import {
  Activity,
  Search,
  Calendar,
  Package,
  User,
  AlertTriangle,
  Clock,
  CheckCircle,
  Eye,
  FileText,
  ArrowUpRight
} from 'lucide-react';
import Link from 'next/link';

// Types
interface BorrowingTransaction {
  id: string;
  borrowDate: string;
  dueDate: string;
  returnDate?: string;
  status: string;
  purpose: string;
  createdAt: string;
  borrowerName: string;
  borrowingItems: Array<{
    id: string;
    quantity: number;
    originalCondition: string;
    returnCondition?: string;
    returnDate?: string;
    tool: {
      id: string;
      name: string;
    };
    borrowedUnits?: Array<{
      id: string;
      toolUnit: {
        unitNumber: number;
        condition: string;
      };
      notes?: string;
    }>;
  }>;
  totalItems: number;
  isOverdue: boolean;
  daysOverdue: number;
  canExtend: boolean;
}

interface ConsumptionTransaction {
  id: string;
  consumptionDate: string;
  purpose: string;
  projectName?: string;
  createdAt: string;
  consumerName: string;
  consumptionItems: Array<{
    id: string;
    quantity: number;
    unitPrice?: number;
    totalValue?: number;
    material: {
      id: string;
      name: string;
      unit: string;
      category: {
        name: string;
      };
    };
  }>;
  totalItems: number;
  totalValue?: number;
}

// API functions
const fetchBorrowings = async (status?: string): Promise<BorrowingTransaction[]> => {
  try {
    const params = new URLSearchParams();
    if (status) {
      // Handle comma-separated statuses
      if (status.includes(',')) {
        status.split(',').forEach(s => params.append('status', s.trim()));
      } else {
        params.append('status', status);
      }
    }

    console.log('Fetching borrowings with params:', params.toString());
    const response = await fetch(`/api/borrowings?${params.toString()}`);
    const result = await response.json();

    console.log('Borrowings API response:', result);
    if (result.data && result.data.length > 0) {
      console.log('Sample borrowing structure:', result.data[0]);
      console.log('Sample borrowing items:', result.data[0]?.borrowingItems?.[0]);
      console.log('Sample borrowed units:', result.data[0]?.borrowingItems?.[0]?.borrowedUnits?.[0]);
    }

    if (result.success) {
      return result.data;
    }
    return [];
  } catch (error) {
    console.error('Error fetching borrowings:', error);
    return [];
  }
};



const fetchConsumptions = async (): Promise<ConsumptionTransaction[]> => {
  try {
    const response = await fetch('/api/consumptions');
    const result = await response.json();

    if (result.success) {
      return result.data;
    }
    return [];
  } catch (error) {
    console.error('Error fetching consumptions:', error);
    return [];
  }
};

// API functions will be implemented when sidebar functionality is complete

export default function Activities() {
  const [activeTab, setActiveTab] = useState("borrowing");
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarType, setSidebarType] = useState<'return' | 'extend'>('return');
  const [selectedBorrowing, setSelectedBorrowing] = useState<BorrowingTransaction | null>(null);
  const [expandedHistory, setExpandedHistory] = useState<string[]>([]);

  // Data states
  const [borrowings, setBorrowings] = useState<BorrowingTransaction[]>([]);
  const [consumptions, setConsumptions] = useState<ConsumptionTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination
  const [borrowingTransactionPage, setBorrowingTransactionPage] = useState(1);
  const [consumingTransactionPage, setConsumingTransactionPage] = useState(1);
  const [historyTransactionPage, setHistoryTransactionPage] = useState(1);
  const pageSize = 10;
  
  // Initialize hooks
  const { showLoading, hideLoading } = useLoading();
  const { toast } = useToast();

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [borrowingsData, consumptionsData] = await Promise.all([
          fetchBorrowings(activeTab === 'borrowing' ? 'ACTIVE, OVERDUE' : undefined),
          fetchConsumptions()
        ]);

        setBorrowings(borrowingsData);
        setConsumptions(consumptionsData);
        setBorrowingTransactionPage(1);
        setConsumingTransactionPage(1);
        setHistoryTransactionPage(1)
      } catch (error) {
        console.error('Error loading activities data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [activeTab]);



  const handleReturnClick = (borrowing: BorrowingTransaction) => {
    setSelectedBorrowing(borrowing);
    setSidebarType('return');
    setSidebarOpen(true);
  };

  const handleExtendClick = (borrowing: BorrowingTransaction) => {
    setSelectedBorrowing(borrowing);
    setSidebarType('extend');
    setSidebarOpen(true);
  };

  const handleFormSubmit = (formData: unknown) => {
    (async () => {
      try {
        console.log('Form submission started:', { sidebarType, formData });
        
        // Show loading with appropriate message
        if (sidebarType === 'return') {
          showLoading('Processing return...');
        } else if (sidebarType === 'extend') {
          showLoading('Extending due date...');
        }

        let response, result;
        if (sidebarType === 'return') {
          const borrowingId = selectedBorrowing?.id;
          console.log('Processing return for borrowing:', borrowingId);

          if (!borrowingId) {
            throw new Error('No borrowing selected for return');
          }

          // Proses pengembalian
          response = await fetch(`/api/borrowings/${borrowingId}/return`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
          });

          console.log('Return response status:', response.status);
          console.log('Return response headers:', response.headers);

          // Check if response is ok
          if (!response.ok) {
            const errorText = await response.text();
            console.error('Return API error response:', errorText);
            throw new Error(`HTTP ${response.status}: ${errorText || 'Failed to process return'}`);
          }

          // Try to parse JSON
          const responseText = await response.text();
          console.log('Return response text:', responseText);

          if (!responseText.trim()) {
            // Empty response - assume success
            result = { success: true, message: 'Return processed successfully' };
          } else {
            try {
              result = JSON.parse(responseText);
            } catch (parseError) {
              console.error('JSON parse error:', parseError);
              throw new Error(`Invalid JSON response: ${responseText}`);
            }
          }

          if (!result.success) throw new Error(result.message || 'Failed to process return');
          
          // Show success toast for return
          toast({
            type: 'success',
            title: 'Return Processed',
            description: `Successfully processed return for ${selectedBorrowing?.borrowerName}`
          });

        } else if (sidebarType === 'extend') {
          const borrowingId = selectedBorrowing?.id;
          console.log('Processing extension for borrowing:', borrowingId);

          if (!borrowingId) {
            throw new Error('No borrowing selected for extension');
          }

          // Proses perpanjangan
          response = await fetch(`/api/borrowings/${borrowingId}/extend`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
          });

          console.log('Extend response status:', response.status);

          // Check if response is ok
          if (!response.ok) {
            const errorText = await response.text();
            console.error('Extend API error response:', errorText);
            throw new Error(`HTTP ${response.status}: ${errorText || 'Failed to process extension'}`);
          }

          // Try to parse JSON
          const responseText = await response.text();
          console.log('Extend response text:', responseText);

          if (!responseText.trim()) {
            // Empty response - assume success
            result = { success: true, message: 'Extension processed successfully' };
          } else {
            try {
              result = JSON.parse(responseText);
            } catch (parseError) {
              console.error('JSON parse error:', parseError);
              throw new Error(`Invalid JSON response: ${responseText}`);
            }
          }

          if (!result.success) throw new Error(result.message || 'Failed to process extension');
          
          // Show success toast for extension
          toast({
            type: 'success',
            title: 'Extension Processed',
            description: `Successfully extended due date for ${selectedBorrowing?.borrowerName}`
          });
        }

        console.log('Operation successful:', result);
        setSidebarOpen(false);

        // Refresh data
        setLoading(true);
        const [borrowingsData, consumptionsData] = await Promise.all([
          fetchBorrowings(activeTab === 'borrowing' ? 'ACTIVE, OVERDUE' : undefined),
          fetchConsumptions()
        ]);
        setBorrowings(borrowingsData);
        setConsumptions(consumptionsData);
        setLoading(false);
        hideLoading();

      } catch (error: unknown) {
        hideLoading();
        console.error('Activities CRUD error:', error);
        const message = error instanceof Error ? error.message : 'Operation failed';
        toast({
          type: 'error',
          title: 'Operation Failed',
          description: message
        });
      }
    })();
  };

  const toggleHistoryDetails = (id: string) => {
    setExpandedHistory(prev =>
      prev.includes(id)
        ? prev.filter(historyId => historyId !== id)
        : [...prev, id]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'overdue': return 'bg-red-100 text-red-800 border-red-200';
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'ongoing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'overdue': return <AlertTriangle className="w-4 h-4" />;
      case 'active': return <Clock className="w-4 h-4" />;
      case 'ongoing': return <Activity className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  // Pagination helpers
  // Filter & paginate Borrowing
  const filteredBorrowings = borrowings.filter(borrowing => {
    const borrowerName = borrowing.borrowerName || '';
    const purpose = borrowing.purpose || '';
    const searchTerm = searchQuery.toLowerCase();
    return borrowerName.toLowerCase().includes(searchTerm) ||
          purpose.toLowerCase().includes(searchTerm);
  });
  const totalBorrowingTransactionPages = Math.max(1, Math.ceil(filteredBorrowings.length / pageSize));
  const paginatedBorrowingTransaction = filteredBorrowings.slice(
    (borrowingTransactionPage - 1) * pageSize,
    borrowingTransactionPage * pageSize
  );
  

  // Filter & paginate Consuming
  const filteredConsumptions = consumptions.filter(consumption =>
    consumption.consumerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    consumption.purpose.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (consumption.projectName && consumption.projectName.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  const totalConsumingTransactionPages = Math.max(1, Math.ceil(filteredConsumptions.length / pageSize));
  const paginatedConsumingTransaction = filteredConsumptions.slice(
    (consumingTransactionPage - 1) * pageSize,
    consumingTransactionPage * pageSize
  );

  // Filter & paginate History
  const filteredHistory = [
    ...borrowings.filter(b => b.status === 'COMPLETED'),
    ...consumptions
  ].filter(transaction => {
    // Search by user, purpose, or item name
    const isBorrowing = 'borrowingItems' in transaction;
    const user = isBorrowing ? transaction.borrowerName : transaction.consumerName;
    const purpose = transaction.purpose || '';
    const items = isBorrowing
      ? transaction.borrowingItems.map(item => item.tool.name).join(' ')
      : transaction.consumptionItems.map(item => item.material.name).join(' ');
    const searchTerm = searchQuery.toLowerCase();
    return user.toLowerCase().includes(searchTerm) ||
          purpose.toLowerCase().includes(searchTerm) ||
          items.toLowerCase().includes(searchTerm);
  }).sort((a, b) => {
    const dateA = 'borrowingItems' in a ? a.createdAt : a.consumptionDate;
    const dateB = 'borrowingItems' in b ? b.createdAt : b.consumptionDate;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });
  const totalHistoryTransactionPages = Math.max(1, Math.ceil(filteredHistory.length / pageSize));
  const paginatedHistoryTransaction = filteredHistory.slice(
    (historyTransactionPage - 1) * pageSize,
    historyTransactionPage * pageSize
  );
  
  // Debug pagination state
  console.log('Activities Pagination Debug:', {
    borrowings: { length: filteredBorrowings.length, page: borrowingTransactionPage, totalPages: totalBorrowingTransactionPages },
    consumptions: { length: filteredConsumptions.length, page: consumingTransactionPage, totalPages: totalConsumingTransactionPages },
    history: { length: filteredHistory.length, page: historyTransactionPage, totalPages: totalHistoryTransactionPages }
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Activities</h1>
            <p className="text-muted-foreground mt-1">Loading activities data...</p>
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
          <h1 className="text-3xl font-bold text-foreground">Activities</h1>
          <p className="text-muted-foreground mt-1">
            Manage borrowing, consuming, and transaction history
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="glass rounded-xl p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search activities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="glass">
          <TabsTrigger value="borrowing" className="flex items-center space-x-2">
            <Package className="w-4 h-4" />
            <span>Borrowing</span>
            <Badge variant="secondary" className="ml-1">
              {borrowings.filter(b => b.status === 'ACTIVE' || b.status === 'OVERDUE').length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="consuming" className="flex items-center space-x-2">
            <Activity className="w-4 h-4" />
            <span>Consuming</span>
            <Badge variant="secondary" className="ml-1">{consumptions.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center space-x-2">
            <Clock className="w-4 h-4" />
            <span>History</span>
          </TabsTrigger>
        </TabsList>

        {/* Borrowing Tab */}
        <TabsContent value="borrowing" className="space-y-4">
          <div className="glass rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/50">
                  <tr>
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">Peminjam</th>
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">Item</th>
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">Jatuh Tempo</th>
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">Tujuan</th>
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedBorrowingTransaction.map((borrowing) => (
                    <tr
                      key={borrowing.id}
                      className={cn(
                        "border-b border-gray-100 hover:bg-white/50 transition-all-smooth",
                        borrowing.isOverdue && "bg-red-50/50"
                      )}
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-3">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">{borrowing.borrowerName}</p>
                            {/* <p className="text-xs text-muted-foreground">{borrowing.user.email}</p> */}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          {borrowing.borrowingItems.slice(0, 2).map((item, index) => (
                            <div key={index} className="text-sm">
                              <span className="font-medium">{item.tool.name}</span>
                              <span className="text-muted-foreground"> (x{item.quantity})</span>
                            </div>
                          ))}
                          {borrowing.borrowingItems.length > 2 && (
                            <div className="text-xs text-muted-foreground">
                              +{borrowing.borrowingItems.length - 2} more items
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className={cn(
                            "text-sm",
                            borrowing.isOverdue && "text-red-600 font-medium"
                          )}>
                            {new Date(borrowing.dueDate).toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm">{borrowing.purpose}</span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(borrowing.isOverdue ? 'overdue' : 'active')}
                          <Badge className={cn("text-xs", getStatusColor(borrowing.isOverdue ? 'overdue' : 'active'))}>
                            {borrowing.isOverdue ? 'Overdue' : 'Active'}
                          </Badge>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReturnClick(borrowing)}
                            className="hover-lift bg-green-50 hover:bg-green-100 text-green-700 border-green-200 hover:border-green-300 transition-all duration-200"
                          >
                            <Package className="w-3 h-3 mr-1" />
                            Return
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleExtendClick(borrowing)}
                            className="hover-lift bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 hover:border-blue-300 transition-all duration-200"
                          >
                            <Calendar className="w-3 h-3 mr-1" />
                            Extend
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredBorrowings.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        No active borrowings found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div className="flex items-center justify-between p-4 border-t bg-white/50">
                <div className="text-sm text-muted-foreground">
                  Showing {(filteredBorrowings.length === 0) ? 0 : ((borrowingTransactionPage - 1) * pageSize + 1)}-
                  {Math.min(borrowingTransactionPage * pageSize, filteredBorrowings.length)} of {filteredBorrowings.length}
                </div>
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={borrowingTransactionPage === 1}
                    onClick={() => {
                      console.log('Prev borrowing button clicked, current page:', borrowingTransactionPage);
                      setBorrowingTransactionPage(prev => {
                        const newPage = Math.max(1, prev - 1);
                        console.log('Setting borrowing page to:', newPage);
                        return newPage;
                      });
                    }}
                  >
                    Prev
                  </Button>
                  <div className="text-sm">Page {borrowingTransactionPage} / {totalBorrowingTransactionPages}</div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={borrowingTransactionPage >= totalBorrowingTransactionPages}
                    onClick={() => {
                      console.log('Next borrowing button clicked, current page:', borrowingTransactionPage, 'total pages:', totalBorrowingTransactionPages);
                      if (borrowingTransactionPage < totalBorrowingTransactionPages) {
                        setBorrowingTransactionPage(prev => {
                          const newPage = Math.min(totalBorrowingTransactionPages, prev + 1);
                          console.log('Setting borrowing page to:', newPage);
                          return newPage;
                        });
                      }
                    }}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Consuming Tab */}
        <TabsContent value="consuming" className="space-y-4">
          <div className="glass rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/50">
                  <tr>
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">Konsumen</th>
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">Material</th>
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">Tanggal Mulai</th>
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">Tujuan</th>
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedConsumingTransaction.map((consumption) => (
                    <tr
                      key={consumption.id}
                      className="border-b border-gray-100 hover:bg-white/50 transition-all-smooth"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-3">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">{consumption.consumerName}</p>
                            {/* <p className="text-xs text-muted-foreground">{consumption.user.email}</p> */}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          {consumption.consumptionItems.slice(0, 2).map((item, index) => (
                            <div key={index} className="text-sm">
                              <span className="font-medium">{item.material.name}</span>
                              <span className="text-muted-foreground"> ({item.quantity} {item.material.unit})</span>
                            </div>
                          ))}
                          {consumption.consumptionItems.length > 2 && (
                            <div className="text-xs text-muted-foreground">
                              +{consumption.consumptionItems.length - 2} more materials
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{new Date(consumption.consumptionDate).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm">{consumption.purpose}</span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon('ongoing')}
                          <Badge className={cn("text-xs", getStatusColor('ongoing'))}>
                            ongoing
                          </Badge>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredConsumptions.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">
                        No recent consumptions found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div className="flex items-center justify-between p-4 border-t bg-white/50">
                <div className="text-sm text-muted-foreground">
                  Showing {(filteredConsumptions.length === 0) ? 0 : ((consumingTransactionPage - 1) * pageSize + 1)}-
                  {Math.min(consumingTransactionPage * pageSize, filteredConsumptions.length)} of {filteredConsumptions.length}
                </div>
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={consumingTransactionPage === 1}
                    onClick={() => {
                      console.log('Prev consuming button clicked, current page:', consumingTransactionPage);
                      setConsumingTransactionPage(prev => {
                        const newPage = Math.max(1, prev - 1);
                        console.log('Setting consuming page to:', newPage);
                        return newPage;
                      });
                    }}
                  >
                    Prev
                  </Button>
                  <div className="text-sm">Page {consumingTransactionPage} / {totalConsumingTransactionPages}</div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={consumingTransactionPage >= totalConsumingTransactionPages}
                    onClick={() => {
                      console.log('Next consuming button clicked, current page:', consumingTransactionPage, 'total pages:', totalConsumingTransactionPages);
                      if (consumingTransactionPage < totalConsumingTransactionPages) {
                        setConsumingTransactionPage(prev => {
                          const newPage = Math.min(totalConsumingTransactionPages, prev + 1);
                          console.log('Setting consuming page to:', newPage);
                          return newPage;
                        });
                      }
                    }}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Combined history of completed transactions (returns and consumptions)
            </p>
            <Button variant="outline" size="sm" asChild className="hover-lift">
              <Link href="/reports">
                <FileText className="w-4 h-4 mr-2" />
                Generate Detailed Report
                <ArrowUpRight className="w-3 h-3 ml-1" />
              </Link>
            </Button>
          </div>

          <div className="glass rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/50">
                  <tr>
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">Date</th>
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">Type</th>
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">User</th>
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">Items</th>
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-4 px-4 font-medium text-muted-foreground">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedHistoryTransaction.map((transaction) => {
                      const isBorrowing = 'borrowingItems' in transaction;
                      return (
                        <React.Fragment key={transaction.id}>
                          <tr
                            className="border-b border-gray-100 hover:bg-white/50 cursor-pointer transition-all-smooth"
                            onClick={() => toggleHistoryDetails(transaction.id)}
                          >
                            <td className="py-4 px-4">
                              <div className="flex items-center space-x-2">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm">
                                  {isBorrowing
                                    ? new Date(transaction.returnDate || transaction.createdAt).toLocaleDateString()
                                    : new Date(transaction.consumptionDate).toLocaleDateString()
                                  }
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <Badge className={cn(
                                "text-xs",
                                isBorrowing
                                  ? "bg-blue-100 text-blue-800 border-blue-200"
                                  : "bg-purple-100 text-purple-800 border-purple-200"
                              )}>
                                {isBorrowing ? 'return' : 'consume'}
                              </Badge>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center space-x-2">
                                <User className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm font-medium">
                                  {isBorrowing ? transaction.borrowerName : transaction.consumerName}
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <span className="text-sm">
                                {isBorrowing
                                  ? transaction.borrowingItems.slice(0, 2).map(item => `${item.tool.name} (x${item.quantity})`).join(', ')
                                  : transaction.consumptionItems.slice(0, 2).map(item => `${item.material.name} (${item.quantity}${item.material.unit})`).join(', ')
                                }
                                {((isBorrowing ? transaction.borrowingItems.length : transaction.consumptionItems.length) > 2) && ' ...'}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center space-x-2">
                                {getStatusIcon('completed')}
                                <Badge className={cn("text-xs", getStatusColor('completed'))}>
                                  completed
                                </Badge>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <Button variant="ghost" size="sm">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>

                          {expandedHistory.includes(transaction.id) && (
                            <tr>
                              <td colSpan={6} className="py-6 px-6 bg-gradient-to-r from-gray-50/80 to-indigo-50/30 border-t border-gray-200">
                                <div className="max-w-6xl mx-auto">
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                                    {/* Transaction Details Section */}
                                    <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 hover:border-indigo-200">
                                      <div className="flex items-center mb-3">
                                        <div className="w-2 h-2 bg-indigo-500 rounded-full mr-2 animate-pulse"></div>
                                        <h4 className="font-semibold text-gray-800">Transaction Details</h4>
                                      </div>
                                      <div className="space-y-2 text-sm">
                                        <div className="flex justify-between items-center py-1">
                                          <span className="text-gray-600">ID:</span>
                                          <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                                            {transaction.id.slice(0, 8)}...
                                          </span>
                                        </div>
                                        <div className="flex justify-between items-center py-1">
                                          <span className="text-gray-600">Date:</span>
                                          <span className="font-medium text-gray-800">
                                            {isBorrowing
                                              ? new Date(transaction.returnDate || transaction.createdAt).toLocaleDateString()
                                              : new Date(transaction.consumptionDate).toLocaleDateString()
                                            }
                                          </span>
                                        </div>
                                        <div className="flex justify-between items-center py-1">
                                          <span className="text-gray-600">Type:</span>
                                          <Badge className={cn(
                                            isBorrowing ? "bg-blue-100 text-blue-800 border-blue-200" :
                                            "bg-purple-100 text-purple-800 border-purple-200"
                                          )}>
                                            {isBorrowing ? 'Return' : 'Consume'}
                                          </Badge>
                                        </div>
                                        <div className="py-1">
                                          <span className="text-gray-600 block mb-1">Purpose:</span>
                                          <p className="text-gray-800 text-xs leading-relaxed">
                                            {transaction.purpose}
                                          </p>
                                        </div>
                                        {!isBorrowing && transaction.totalValue && (
                                          <div className="flex justify-between items-center py-1">
                                            <span className="text-gray-600">Total Value:</span>
                                            <span className="font-semibold text-green-600">
                                              Rp {Number(transaction.totalValue).toLocaleString()}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Items Section */}
                                    <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 hover:border-green-200">
                                      <div className="flex items-center mb-3">
                                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                                        <h4 className="font-semibold text-gray-800">
                                          Items ({isBorrowing ? transaction.borrowingItems?.length : transaction.consumptionItems?.length})
                                        </h4>
                                      </div>
                                      <div className="space-y-2 max-h-32 overflow-y-auto">
                                        {isBorrowing
                                          ? transaction.borrowingItems?.map(item => (
                                              <div key={item.id} className="flex justify-between items-center py-1 px-2 bg-gray-50 rounded text-sm">
                                                <span className="font-medium text-gray-800 truncate flex-1 mr-2">
                                                  {item.tool.name}
                                                </span>
                                                <span className="text-gray-600 font-mono text-xs">
                                                  {item.quantity} units
                                                </span>
                                              </div>
                                            ))
                                          : transaction.consumptionItems?.map(item => (
                                              <div key={item.id} className="flex justify-between items-center py-1 px-2 bg-gray-50 rounded text-sm">
                                                <span className="font-medium text-gray-800 truncate flex-1 mr-2">
                                                  {item.material.name}
                                                </span>
                                                <span className="text-gray-600 font-mono text-xs">
                                                  {item.quantity} {item.material.unit}
                                                </span>
                                              </div>
                                            ))
                                        }
                                      </div>
                                    </div>

                                    {/* Status & Summary Section */}
                                    <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 hover:border-orange-200">
                                      <div className="flex items-center mb-3">
                                        <div className="w-2 h-2 bg-orange-500 rounded-full mr-2 animate-pulse"></div>
                                        <h4 className="font-semibold text-gray-800">Summary</h4>
                                      </div>
                                      <div className="space-y-2 text-sm">
                                        <div className="flex justify-between items-center py-1">
                                          <span className="text-gray-600">Status:</span>
                                          <Badge className="bg-green-100 text-green-800 border-green-200">
                                            Completed
                                          </Badge>
                                        </div>
                                        <div className="flex justify-between items-center py-1">
                                          <span className="text-gray-600">Total Items:</span>
                                          <span className="font-medium text-gray-800">
                                            {isBorrowing ? transaction.borrowingItems?.length : transaction.consumptionItems?.length}
                                          </span>
                                        </div>
                                        <div className="flex justify-between items-center py-1">
                                          <span className="text-gray-600">Person:</span>
                                          <span className="font-medium text-gray-800">
                                            {isBorrowing ? transaction.borrowerName : transaction.consumerName}
                                          </span>
                                        </div>
                                        {isBorrowing && transaction.returnDate && (
                                          <div className="flex justify-between items-center py-1">
                                            <span className="text-gray-600">Returned:</span>
                                            <span className="font-medium text-green-600">
                                              {new Date(transaction.returnDate).toLocaleDateString()}
                                            </span>
                                          </div>
                                        )}
                                        {!isBorrowing && transaction.projectName && (
                                          <div className="py-1">
                                            <span className="text-gray-600 block mb-1">Project:</span>
                                            <p className="text-gray-800 text-xs bg-gray-50 p-2 rounded">
                                              {transaction.projectName}
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  {filteredHistory.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        No transaction history found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div className="flex items-center justify-between p-4 border-t bg-white/50">
                <div className="text-sm text-muted-foreground">
                  Showing {(filteredHistory.length === 0) ? 0 : ((historyTransactionPage - 1) * pageSize + 1)}-
                  {Math.min(historyTransactionPage * pageSize, filteredHistory.length)} of {filteredHistory.length}
                </div>
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={historyTransactionPage === 1}
                    onClick={() => {
                      console.log('Prev history button clicked, current page:', historyTransactionPage);
                      setHistoryTransactionPage(prev => {
                        const newPage = Math.max(1, prev - 1);
                        console.log('Setting history page to:', newPage);
                        return newPage;
                      });
                    }}
                  >
                    Prev
                  </Button>
                  <div className="text-sm">Page {historyTransactionPage} / {totalHistoryTransactionPages}</div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={historyTransactionPage >= totalHistoryTransactionPages}
                    onClick={() => {
                      console.log('Next history button clicked, current page:', historyTransactionPage, 'total pages:', totalHistoryTransactionPages);
                      if (historyTransactionPage < totalHistoryTransactionPages) {
                        setHistoryTransactionPage(prev => {
                          const newPage = Math.min(totalHistoryTransactionPages, prev + 1);
                          console.log('Setting history page to:', newPage);
                          return newPage;
                        });
                      }
                    }}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Contextual Sidebar */}
      <ContextualSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        type={sidebarType}
        borrowing={selectedBorrowing ? {
          id: selectedBorrowing.id,
          borrower: selectedBorrowing.borrowerName || 'Unknown User',
          items: selectedBorrowing.borrowingItems?.map((item) => ({
            id: item.id,
            name: item.tool?.name || 'Unknown Tool',
            type: 'tool' as const,
            quantity: item.quantity || 0,
            originalCondition: (item.originalCondition as 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR') || 'GOOD',
            units: item.borrowedUnits?.map((unit) => ({
              id: unit.id, // This should be borrowingItemUnitId
              unitNumber: unit.toolUnit?.unitNumber || 1,
              condition: (unit.toolUnit?.condition as 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR') || 'GOOD',
              isAvailable: false, // These are borrowed units
              notes: unit.notes || ''
            })) || []
          })).filter(Boolean) || [],
          dueDate: selectedBorrowing.dueDate || new Date().toISOString(),
          purpose: selectedBorrowing.purpose || 'No purpose specified'
        } : undefined}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}
