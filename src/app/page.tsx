'use client';

import React, { useState, useEffect, useRef } from 'react';
import { KPICard } from '@/components/ui/kpi-card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Package,
  Wrench,
  ArrowRightLeft,
  TrendingDown,
  Clock,
  User,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';

// Types
interface KPIData {
  title: string;
  value: string;
  trend: { value: number; isPositive: boolean };
  icon: string;
  description?: string;
}

interface Activity {
  id: string;
  time: string;
  activity: string;
  user: string;
  items: string;
  status: string;
  type: string;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: string;
  time: string;
}

// Icon mapping
const getIcon = (iconName: string) => {
  const icons: Record<string, React.ReactNode> = {
    wrench: <Wrench className="w-6 h-6 text-primary" />,
    package: <Package className="w-6 h-6 text-primary" />,
    'arrow-right-left': <ArrowRightLeft className="w-6 h-6 text-primary" />,
    'trending-down': <TrendingDown className="w-6 h-6 text-primary" />,
    'trending-up': <TrendingDown className="w-6 h-6 text-primary rotate-180" />,
    'alert-triangle': <AlertTriangle className="w-6 h-6 text-primary" />
  };
  return icons[iconName] || <Package className="w-6 h-6 text-primary" />;
};

// API fetch functions
const fetchKPIs = async (): Promise<KPIData[]> => {
  try {
    const response = await fetch('/api/dashboard/kpis');

    // Check if response is ok
    if (!response.ok) {
      console.error('KPI API response not ok:', response.status, response.statusText);
      return [];
    }

    // Check if response has content
    const text = await response.text();
    if (!text) {
      console.error('Empty response from KPI API');
      return [];
    }

    // Try to parse JSON
    let result;
    try {
      result = JSON.parse(text);
    } catch (parseError) {
      console.error('Failed to parse KPI response as JSON:', parseError);
      console.error('Response text:', text);
      return [];
    }

    if (result.success && Array.isArray(result.data)) {
      return result.data.map((kpi: any) => ({
        ...kpi,
        icon: getIcon(kpi.icon)
      }));
    }

    console.error('Invalid KPI response format:', result);
    return [];
  } catch (error) {
    console.error('Error fetching KPIs:', error);
    return [];
  }
};

const fetchActivities = async (): Promise<Activity[]> => {
  try {
    const response = await fetch('/api/dashboard/activities?limit=5');

    if (!response.ok) {
      console.error('Activities API response not ok:', response.status, response.statusText);
      return [];
    }

    const text = await response.text();
    if (!text) {
      console.error('Empty response from Activities API');
      return [];
    }

    let result;
    try {
      result = JSON.parse(text);
    } catch (parseError) {
      console.error('Failed to parse Activities response as JSON:', parseError);
      return [];
    }

    if (result.success && Array.isArray(result.data)) {
      return result.data;
    }
    return [];
  } catch (error) {
    console.error('Error fetching activities:', error);
    return [];
  }
};

const fetchNotifications = async (): Promise<Notification[]> => {
  try {
    const response = await fetch('/api/dashboard/notifications?limit=4');

    if (!response.ok) {
      console.error('Notifications API response not ok:', response.status, response.statusText);
      return [];
    }

    const text = await response.text();
    if (!text) {
      console.error('Empty response from Notifications API');
      return [];
    }

    let result;
    try {
      result = JSON.parse(text);
    } catch (parseError) {
      console.error('Failed to parse Notifications response as JSON:', parseError);
      return [];
    }

    if (result.success && Array.isArray(result.data)) {
      return result.data;
    }
    return [];
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'active': return <Clock className="w-4 h-4 text-blue-500" />;
    case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
    default: return <FileText className="w-4 h-4 text-gray-500" />;
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high': return 'bg-red-100 text-red-800 border-red-200';
    case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'low': return 'bg-green-100 text-green-800 border-green-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("activities");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [kpiData, setKpiData] = useState<KPIData[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const sliderRef = useRef<HTMLDivElement>(null);

  // Fetch data on component mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [kpisData, activitiesData, notificationsData] = await Promise.all([
          fetchKPIs(),
          fetchActivities(),
          fetchNotifications()
        ]);

        setKpiData(kpisData);
        setActivities(activitiesData);
        setNotifications(notificationsData);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Auto-slide effect
  useEffect(() => {
    if (kpiData.length === 0) return;

    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % kpiData.length);
    }, 3000); // Slide every 3 seconds

    return () => clearInterval(interval);
  }, [kpiData.length]);

  // Update slider position
  useEffect(() => {
    if (sliderRef.current && kpiData.length > 0) {
      const cardWidth = 280 + 16; // card width + gap
      sliderRef.current.style.transform = `translateX(-${currentSlide * cardWidth}px)`;
    }
  }, [currentSlide, kpiData.length]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Loading dashboard data...
            </p>
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
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Overview of your tools and materials management
          </p>
        </div>
        <Button className="hover-lift">
          <FileText className="w-4 h-4 mr-2" />
          Generate Report
        </Button>
      </div>

      {/* KPI Slider */}
      {kpiData.length > 0 && (
        <div className="relative overflow-hidden">
          <div
            ref={sliderRef}
            className="flex space-x-4 transition-transform duration-500 ease-in-out"
            style={{ width: `${kpiData.length * 296}px` }}
          >
            {kpiData.map((kpi, index) => (
              <KPICard
                key={index}
                title={kpi.title}
                value={kpi.value}
                trend={kpi.trend}
                icon={kpi.icon}
              />
            ))}
          </div>

          {/* Dots Indicator */}
          <div className="flex justify-center space-x-2 mt-4">
            {kpiData.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-300",
                  currentSlide === index
                    ? "bg-primary scale-125"
                    : "bg-gray-300 hover:bg-gray-400"
                )}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="glass">
          <TabsTrigger value="activities">Last 5 Activities</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="contextual">Contextual</TabsTrigger>
        </TabsList>

        <TabsContent value="activities" className="space-y-4">
          <div className="glass rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Activities</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Time</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Activity</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">User</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Item(s)</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((activity, index) => (
                    <tr
                      key={activity.id}
                      className="border-b border-gray-100 hover:bg-white/50 cursor-pointer transition-all-smooth"
                    >
                      <td className="py-3 px-4 text-sm">{activity.time}</td>
                      <td className="py-3 px-4 text-sm font-medium">{activity.activity}</td>
                      <td className="py-3 px-4 text-sm flex items-center">
                        <User className="w-4 h-4 mr-2 text-muted-foreground" />
                        {activity.user}
                      </td>
                      <td className="py-3 px-4 text-sm">{activity.items}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(activity.status)}
                          <span className="text-sm capitalize">{activity.status}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {activities.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">
                        No recent activities found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <div className="glass rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Notifications</h3>
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="p-4 rounded-lg border transition-all-smooth hover:shadow-md glass"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium text-sm">{notification.title}</h4>
                        <Badge className={cn("text-xs", getPriorityColor(notification.priority))}>
                          {notification.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground">{notification.time}</p>
                    </div>
                    <Button variant="outline" size="sm" className="ml-4">
                      Action
                    </Button>
                  </div>
                </div>
              ))}
              {notifications.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No notifications at this time
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="contextual" className="space-y-4">
          <div className="glass rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Last 7 Days Activity Chart</h3>
            <div className="h-64 flex items-center justify-center bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">Chart visualization will be implemented here</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Activity trends, borrowing patterns, and consumption analytics
                </p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
