import React from 'react';
import { 
  Package, 
  TrendingUp, 
  BarChart3, 
  Archive,
  FileText,
  Users,
  Calendar,
  AlertCircle
} from 'lucide-react';

// Static Icon Registry - Solves dynamic component loading issues
export const iconRegistry = {
  Package,
  TrendingUp,
  BarChart3,
  Archive,
  FileText,
  Users,
  Calendar,
  AlertCircle
} as const;

export type IconName = keyof typeof iconRegistry;

// Safe icon renderer
export function renderIcon(iconName: IconName, props?: any) {
  const IconComponent = iconRegistry[iconName];
  if (!IconComponent) {
    console.error(`Icon "${iconName}" not found in registry`);
    return <AlertCircle {...props} />;
  }
  return <IconComponent {...props} />;
}

// Get icon component by name
export function getIconComponent(iconName: IconName): React.ComponentType<any> {
  return iconRegistry[iconName] || AlertCircle;
}
