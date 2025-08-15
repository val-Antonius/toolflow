'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Sidebar 
        isCollapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />
      <main className={cn(
        "flex-1 overflow-auto transition-all-smooth",
        "bg-white/30 backdrop-blur-sm"
      )}>
        <div className="p-6 h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
