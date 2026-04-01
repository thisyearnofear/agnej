/**
 * IPFS Service
 * Handles uploading game state history to IPFS for verifiable replays
 * 
 * Following Core Principles:
 * - MODULAR: Independent service for data persistence
 * - CLEAN: Explicit dependencies on external gateways
 */

export interface GameStateHistory {
  timestamp: number;
  score: number;
  difficulty: string;
  mode: string;
  blocks: Array<{
    id: number;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number, w: number };
  }>;
}

const LOCAL_REPLAY_PREFIX = 'local:'
const LOCAL_REPLAY_STORAGE_PREFIX = 'agnej-replay:'

function getLocalReplayStorageKey(reference: string): string {
  return `${LOCAL_REPLAY_STORAGE_PREFIX}${reference.replace(LOCAL_REPLAY_PREFIX, '')}`
}

function saveReplayLocally(history: GameStateHistory): string {
  const replayId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  const reference = `${LOCAL_REPLAY_PREFIX}${replayId}`

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(getLocalReplayStorageKey(reference), JSON.stringify(history))
  }

  return reference
}

/**
 * Uploads game state history to IPFS
 * Falls back to local browser persistence if IPFS pinning is unavailable
 */
export async function uploadToIPFS(history: GameStateHistory): Promise<string> {
  console.log('[IPFS] Uploading game history...', history);
  
  try {
    const response = await fetch('/api/ipfs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(history)
    })

    if (!response.ok) {
      throw new Error(`IPFS pinning failed with status ${response.status}`)
    }

    const data = await response.json()

    if (!data?.cid) {
      throw new Error('IPFS pinning response did not include a CID')
    }

    console.log('[IPFS] Successfully pinned history. CID:', data.cid)
    return data.cid
  } catch (error) {
    console.error('[IPFS] Upload failed, falling back to local replay storage:', error)
    return saveReplayLocally(history)
  }
}

/**
 * Generates an app URL for viewing a replay reference
 */
export function getReplayUrl(reference: string): string {
  return `/replay/${encodeURIComponent(reference)}`
}

export function isLocalReplayReference(reference: string): boolean {
  return reference.startsWith(LOCAL_REPLAY_PREFIX)
}

export function getPublicIPFSUrl(cid: string): string {
  return `https://ipfs.io/ipfs/${cid}`
}

export function loadLocalReplay(reference: string): GameStateHistory | null {
  if (typeof window === 'undefined' || !isLocalReplayReference(reference)) {
    return null
  }

  const raw = window.localStorage.getItem(getLocalReplayStorageKey(reference))
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as GameStateHistory
  } catch (error) {
    console.error('[IPFS] Failed to parse local replay data:', error)
    return null
  }
}
