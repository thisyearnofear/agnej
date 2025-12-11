'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import PageTransition from './PageTransition'

interface LayoutWrapperProps {
  children: React.ReactNode
}

export default function LayoutWrapper({ children }: LayoutWrapperProps) {
  const pathname = usePathname()
  
  // Determine transition type based on route
  const getTransitionType = () => {
    if (pathname.includes('/play')) return 'slide'
    if (pathname.includes('/leaderboard')) return 'fade'
    return 'fade' // default
  }
  
  return (
    <PageTransition key={pathname} transitionType={getTransitionType()}>
      {children}
    </PageTransition>
  )
}