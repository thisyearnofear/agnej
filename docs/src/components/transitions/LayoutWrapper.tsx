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
  const getTransitionType = (): 'fade' | 'slide' | 'scale' | 'flip' | 'scan' => {
    if (pathname.includes('/play')) return 'scan'
    if (pathname.includes('/leaderboard')) return 'scan'
    return 'scan' // default to dramatic scan effect
  }
  
  return (
    <PageTransition key={pathname} transitionType={getTransitionType()}>
      {children}
    </PageTransition>
  )
}