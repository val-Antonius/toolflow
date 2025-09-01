'use client';

import React, { useState, useEffect, useRef } from 'react';
import { KPICard } from '@/components/ui/kpi-card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChartAnalytics } from '@/components/dashboard/chart-analytics';
import { cn } from '@/lib/utils';
import {
  Package,
  Wrench,
  Clock,
  User,
  FileText,
  CheckCircle,
  BarChart3
} from 'lucide-react';

// Types
interface KPIData {
  id: string;
  title: string;
  value: string;
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

// Icon mapping
const getIcon = (iconName: string) => {
  const icons: Record<string, React.ReactNode> = {
    wrench: <Wrench className="w-6 h-6 text-primary" />,
    package: <Package className="w-6 h-6 text-primary" />,
    'alert-triangle': <BarChart3 className="w-6 h-6 text-primary" />
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
      return result.data.map((kpi, index) => ({
        id: `kpi-${index}`,
        title: kpi.title,
        value: kpi.value,
        icon: getIcon(kpi.icon),
        description: kpi.description
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

// Removed fetchNotifications function as notifications tab is no longer needed

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'active': return <Clock className="w-4 h-4 text-blue-500" />;
    case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
    default: return <FileText className="w-4 h-4 text-gray-500" />;
  }
};

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("activities");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [kpiData, setKpiData] = useState<KPIData[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const sliderRef = useRef<HTMLDivElement>(null);

  // Fetch data on component mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [kpisData, activitiesData] = await Promise.all([
          fetchKPIs(),
          fetchActivities()
        ]);

        setKpiData(kpisData);
        setActivities(activitiesData);
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
            {kpiData.map((kpi) => (
              <KPICard
                key={kpi.id}
                title={kpi.title}
                value={kpi.value}
                icon={kpi.icon}
                description={kpi.description}
              />
            ))}
          </div>

          {/* Dots Indicator */}
          <div className="flex justify-center space-x-2 mt-4">
            {kpiData.map((kpi, index) => (
              <button
                key={kpi.id}
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
          <TabsTrigger value="activities">Last Activities</TabsTrigger>
          <TabsTrigger value="analytics">Chart Analytics</TabsTrigger>
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
                  {activities.map((activity) => (
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

        <TabsContent value="analytics" className="space-y-4">
          <ChartAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
}
