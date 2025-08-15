'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ContextualSidebar } from '@/components/ui/contextual-sidebar';
import { cn } from '@/lib/utils';
import {
  Activity,
  Search,
  Filter,
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
  user: {
    id: string;
    name: string;
    email: string;
    department?: string;
  };
  borrowingItems: Array<{
    id: string;
    quantity: number;
    originalCondition: string;
    returnCondition?: string;
    returnDate?: string;
    tool: {
      id: string;
      name: string;
      condition: string;
    };
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
  user: {
    id: string;
    name: string;
    email: string;
    department?: string;
  };
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
    if (status) params.append('status', status);

    const response = await fetch(`/api/borrowings?${params.toString()}`);
    const result = await response.json();

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
  const [selectedBorrowing, setSelectedBorrowing] = useState<any>(null);
  const [expandedHistory, setExpandedHistory] = useState<string[]>([]);

  // Data states
  const [borrowings, setBorrowings] = useState<BorrowingTransaction[]>([]);
  const [consumptions, setConsumptions] = useState<ConsumptionTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [borrowingsData, consumptionsData] = await Promise.all([
          fetchBorrowings(activeTab === 'borrowing' ? 'ACTIVE' : undefined),
          fetchConsumptions()
        ]);

        setBorrowings(borrowingsData);
        setConsumptions(consumptionsData);
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

  const handleFormSubmit = async (formData: any) => {
    try {
      let response, result;
      if (sidebarType === 'return') {
        // Proses pengembalian
        response = await fetch(`/api/borrowings/${formData.borrowingId}/return`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        result = await response.json();
        if (!result.success) throw new Error(result.message || 'Failed to process return');
      } else if (sidebarType === 'extend') {
        // Proses perpanjangan
        response = await fetch(`/api/borrowings/${formData.borrowingId}/extend`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        result = await response.json();
        if (!result.success) throw new Error(result.message || 'Failed to process extension');
      }
      setSidebarOpen(false);
      // Refresh data
      setLoading(true);
      const [borrowingsData, consumptionsData] = await Promise.all([
        fetchBorrowings(activeTab === 'borrowing' ? 'ACTIVE' : undefined),
        fetchConsumptions()
      ]);
      setBorrowings(borrowingsData);
      setConsumptions(consumptionsData);
      setLoading(false);
    } catch (error: any) {
      alert(error.message || 'Operation failed');
      console.error('Activities CRUD error:', error);
    }
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
        <Button asChild className="hover-lift">
          <Link href="/reports">
            <FileText className="w-4 h-4 mr-2" />
            Generate Report
          </Link>
        </Button>
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
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
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
                  {borrowings.filter(borrowing =>
                    borrowing.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    borrowing.purpose.toLowerCase().includes(searchQuery.toLowerCase())
                  ).map((borrowing) => (
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
                            <p className="font-medium text-sm">{borrowing.user.name}</p>
                            <p className="text-xs text-muted-foreground">{borrowing.user.email}</p>
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
                            className="hover-lift"
                          >
                            Return
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleExtendClick(borrowing)}
                            className="hover-lift"
                          >
                            Extend
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {borrowings.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        No active borrowings found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
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
                  {consumptions.filter(consumption =>
                    consumption.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    consumption.purpose.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (consumption.projectName && consumption.projectName.toLowerCase().includes(searchQuery.toLowerCase()))
                  ).map((consumption) => (
                    <tr
                      key={consumption.id}
                      className="border-b border-gray-100 hover:bg-white/50 transition-all-smooth"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-3">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">{consumption.user.name}</p>
                            <p className="text-xs text-muted-foreground">{consumption.user.email}</p>
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
                  {consumptions.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">
                        No recent consumptions found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
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
              <Link href="/reports?preset=history">
                <FileText className="w-4 h-4 mr-2" />
                Generate History Report
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
                  {[...borrowings.filter(b => b.status === 'COMPLETED'), ...consumptions]
                    .sort((a, b) => {
                      const dateA = 'borrowingItems' in a ? a.createdAt : a.consumptionDate;
                      const dateB = 'borrowingItems' in b ? b.createdAt : b.consumptionDate;
                      return new Date(dateB).getTime() - new Date(dateA).getTime();
                    })
                    .slice(0, 10)
                    .map((transaction) => {
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
                                <span className="text-sm font-medium">{transaction.user.name}</span>
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
                              <td colSpan={6} className="py-4 px-6 bg-gray-50/50">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <h4 className="font-medium text-sm mb-2">Transaction Details</h4>
                                    <div className="space-y-1 text-sm">
                                      <p><strong>ID:</strong> {transaction.id}</p>
                                      <p><strong>Date:</strong> {isBorrowing
                                        ? new Date(transaction.returnDate || transaction.createdAt).toLocaleDateString()
                                        : new Date(transaction.consumptionDate).toLocaleDateString()
                                      }</p>
                                      <p><strong>Type:</strong> {isBorrowing ? 'return' : 'consume'}</p>
                                      <p><strong>Purpose:</strong> {transaction.purpose}</p>
                                      {!isBorrowing && transaction.totalValue && (
                                        <p><strong>Total Value:</strong> Rp {Number(transaction.totalValue).toLocaleString()}</p>
                                      )}
                                    </div>
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-sm mb-2">Items Information</h4>
                                    <div className="space-y-1 text-sm">
                                      {isBorrowing
                                        ? transaction.borrowingItems.map(item => (
                                            <p key={item.id}><strong>{item.tool.name}:</strong> {item.quantity} units</p>
                                          ))
                                        : transaction.consumptionItems.map(item => (
                                            <p key={item.id}><strong>{item.material.name}:</strong> {item.quantity} {item.material.unit}</p>
                                          ))
                                      }
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  {borrowings.length === 0 && consumptions.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        No transaction history found
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
      <ContextualSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        type={sidebarType}
        borrowing={selectedBorrowing ? {
          id: selectedBorrowing.id,
          borrower: selectedBorrowing.user?.name || '',
          items: selectedBorrowing.borrowingItems?.map((item: any) => ({
            id: item.id,
            name: item.tool.name,
            quantity: item.quantity,
            originalCondition: item.originalCondition
          })) || [],
          dueDate: selectedBorrowing.dueDate || '',
          purpose: selectedBorrowing.purpose || ''
        } : undefined}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}
