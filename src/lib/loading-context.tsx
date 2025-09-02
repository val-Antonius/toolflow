"use client"

import React, { createContext, useContext, useState, ReactNode } from "react"

interface LoadingContextType {
  isLoading: boolean
  message?: string
  showLoading: (msg?: string) => void
  hideLoading: () => void
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined)

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | undefined>(undefined)

  const showLoading = (msg?: string) => {
    setMessage(msg)
    setIsLoading(true)
  }

  const hideLoading = () => {
    setIsLoading(false)
    setMessage(undefined)
  }

  return (
    <LoadingContext.Provider value={{ isLoading, message, showLoading, hideLoading }}>
      {children}
    </LoadingContext.Provider>
  )
}

export function useLoading() {
  const context = useContext(LoadingContext)
  if (undefined === context) {
    throw new Error("useLoading must be used within a LoadingProvider")
  }
  return context
}