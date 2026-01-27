/**
 * Centralized Configuration
 * Single source of truth for all app configuration
 * 
 * Core Principles:
 * - DRY: All constants defined once, imported everywhere
 * - CLEAN: Clear separation by domain (contracts, networks, game)
 * - ORGANIZED: Predictable structure, domain-driven
 */

export * from './contracts'
export * from './networks'
export * from './game'
