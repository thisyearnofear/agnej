'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { getPublicIPFSUrl, isLocalReplayReference, loadLocalReplay, type GameStateHistory } from '@/lib/ipfs'

const IPFS_GATEWAYS = [
  'https://ipfs.io/ipfs',
  'https://cloudflare-ipfs.com/ipfs',
  'https://dweb.link/ipfs'
]

export default function ReplayPage() {
  const params = useParams<{ reference: string }>()
  const [reference, setReference] = useState<string>('')
  const [history, setHistory] = useState<GameStateHistory | null>(null)
  const [error, setError] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (params?.reference) {
      setReference(decodeURIComponent(params.reference))
    }
  }, [params])

  useEffect(() => {
    if (!reference) return

    const loadReplay = async () => {
      setIsLoading(true)
      setError('')

      if (isLocalReplayReference(reference)) {
        const localReplay = loadLocalReplay(reference)

        if (!localReplay) {
          setError('This local replay is not available in this browser anymore.')
          setIsLoading(false)
          return
        }

        setHistory(localReplay)
        setIsLoading(false)
        return
      }

      for (const gateway of IPFS_GATEWAYS) {
        try {
          const response = await fetch(`${gateway}/${reference}`)
          if (!response.ok) {
            continue
          }

          const replay = await response.json()
          setHistory(replay)
          setIsLoading(false)
          return
        } catch {
          continue
        }
      }

      setError('Unable to load this replay from the configured IPFS gateways.')
      setIsLoading(false)
    }

    loadReplay()
  }, [reference])

  const sortedBlocks = useMemo(() => {
    if (!history) return []
    return [...history.blocks].sort((a, b) => b.position.y - a.position.y)
  }, [history])

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white px-4 py-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-cyan-300 text-sm uppercase tracking-[0.25em]">Replay Viewer</p>
            <h1 className="text-3xl md:text-4xl font-black">Game Replay</h1>
          </div>
          <Link href="/play" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition-colors">
            Back to Game
          </Link>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-md p-5 space-y-2">
          <div className="text-sm text-white/60">Reference</div>
          <div className="font-mono text-xs md:text-sm break-all">{reference || 'Loading reference...'}</div>
          {!isLocalReplayReference(reference) && reference && (
            <a
              href={getPublicIPFSUrl(reference)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex text-cyan-300 hover:text-cyan-200 text-sm"
            >
              Open raw IPFS JSON
            </a>
          )}
        </div>

        {isLoading && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/70">
            Loading replay...
          </div>
        )}

        {!isLoading && error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 space-y-2">
            <div className="text-lg font-bold text-red-300">Replay unavailable</div>
            <div className="text-sm text-red-100/85">{error}</div>
            <div className="text-xs text-red-100/60">
              IPFS uploads require `PINATA_JWT` to be configured on the server. Without it, replays are saved only in the browser that created them.
            </div>
          </div>
        )}

        {!isLoading && history && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-wide text-white/50">Mode</div>
                <div className="text-lg font-bold">{history.mode.replace(/_/g, ' ')}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-wide text-white/50">Difficulty</div>
                <div className="text-lg font-bold">{history.difficulty}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-wide text-white/50">Score</div>
                <div className="text-lg font-bold">{history.score}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-wide text-white/50">Blocks</div>
                <div className="text-lg font-bold">{history.blocks.length}</div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/30 backdrop-blur-md p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Final Tower State</h2>
                <div className="text-sm text-white/50">
                  {new Date(history.timestamp).toLocaleString()}
                </div>
              </div>

              <div className="space-y-2 max-h-[28rem] overflow-y-auto pr-2">
                {sortedBlocks.map((block) => (
                  <div key={block.id} className="grid grid-cols-[auto,1fr] gap-4 rounded-xl border border-white/5 bg-white/5 px-4 py-3">
                    <div className="font-mono text-cyan-300 text-sm">#{block.id}</div>
                    <div className="grid md:grid-cols-2 gap-2 text-xs md:text-sm text-white/80 font-mono">
                      <div>
                        Pos: {block.position.x.toFixed(2)}, {block.position.y.toFixed(2)}, {block.position.z.toFixed(2)}
                      </div>
                      <div>
                        Rot: {block.rotation.x.toFixed(3)}, {block.rotation.y.toFixed(3)}, {block.rotation.z.toFixed(3)}, {block.rotation.w.toFixed(3)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
