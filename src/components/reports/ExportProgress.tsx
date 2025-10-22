'use client';

import React from 'react';
import { ExportProgress as ExportProgressType } from '@/hooks/usePDFExport';
import { CheckCircle, AlertCircle, Download, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExportProgressProps {
  progress: ExportProgressType;
  className?: string;
}

export function ExportProgress({ progress, className }: ExportProgressProps) {
  const getIcon = () => {
    switch (progress.stage) {
      case 'preparing':
        return <FileText className="w-5 h-5 text-blue-600 animate-pulse" />;
      case 'generating':
        return <FileText className="w-5 h-5 text-blue-600 animate-spin" />;
      case 'downloading':
        return <Download className="w-5 h-5 text-blue-600 animate-bounce" />;
      case 'complete':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  const getProgressColor = () => {
    switch (progress.stage) {
      case 'complete':
        return 'bg-green-600';
      case 'error':
        return 'bg-red-600';
      default:
        return 'bg-blue-600';
    }
  };

  const getBackgroundColor = () => {
    switch (progress.stage) {
      case 'complete':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className={cn(
      "fixed top-4 right-4 z-50 p-4 rounded-lg border shadow-lg max-w-sm",
      getBackgroundColor(),
      className
    )}>
      <div className="flex items-center space-x-3">
        {getIcon()}
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">
            {progress.message}
          </p>
          {progress.stage !== 'error' && progress.stage !== 'complete' && (
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={cn("h-2 rounded-full transition-all duration-300", getProgressColor())}
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {progress.progress}% selesai
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
