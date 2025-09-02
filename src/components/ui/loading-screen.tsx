"use client"

import { cn } from "@/lib/utils"

interface LoadingScreenProps {
  message?: string
  className?: string
}

const LoadingScreen = ({ message, className }: LoadingScreenProps) => {
  return (
    <div className={cn("fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm", className)}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4" />
        {message && <p className="text-lg font-medium">{message}</p>}
      </div>
    </div>
  )
}

export { LoadingScreen }