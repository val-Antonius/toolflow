import React from 'react';
import { 
  Package, 
  TrendingUp, 
  BarChart3, 
  Archive,
  FileText,
  Users,
  Calendar,
  AlertCircle,
  LucideProps
} from 'lucide-react';

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
export function renderIcon(iconName: IconName, props?: LucideProps): React.ReactElement {
  const IconComponent = iconRegistry[iconName];
  if (!IconComponent) {
    console.error(`Icon "${iconName}" not found in registry`);
    return <AlertCircle {...props} />;
  }
  return <IconComponent {...props} />;
}

// Get icon component by name
export function getIconComponent(iconName: IconName): React.ComponentType<LucideProps> {
  return iconRegistry[iconName] || AlertCircle;
}