'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from './button';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Package, 
  Activity, 
  FileText, 
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Package, label: 'Tools & Materials', path: '/inventory' },
  { icon: Activity, label: 'Activities', path: '/activities' },
  { icon: FileText, label: 'Reports', path: '/reports' },
];

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div className={cn(
      "glass border-r border-white/20 h-screen transition-all-smooth flex flex-col",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg">ToolTrack</span>
            </div>
          )}
          {isCollapsed && (
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="hover:bg-white/10 transition-all-smooth"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              title={isCollapsed ? item.label : undefined}
              className={cn(
                "flex items-center px-3 py-3 rounded-lg transition-all-smooth hover-lift group",
                isActive
                  ? "bg-primary text-white shadow-lg"
                  : "hover:bg-white/10 text-foreground",
                isCollapsed ? "justify-center" : "space-x-3"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5 transition-all-smooth",
                isActive ? "" : "group-hover:scale-110"
              )} />
              {!isCollapsed && (
                <span className="font-medium">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      {!isCollapsed && (
        <div className="p-4 border-t border-white/10">
          <div className="text-xs text-muted-foreground text-center">
            © 2024 ToolTrack
          </div>
        </div>
      )}
    </div>
  );
}
