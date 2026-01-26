'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import Link from 'next/link'
import Image from 'next/image'
import InteractiveTower from './InteractiveTower'
import ImmersiveBackground from './ui/ImmersiveBackground'

export default function LandingHero() {
  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const { isConnected, address } = useAccount()

  useEffect(() => {
    setMounted(true)
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return (
    <ImmersiveBackground>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black text-white overflow-hidden">

        <header className="flex justify-between items-center p-6 border-b border-white/10 relative z-10 animate-fadeIn">
          <Link href="/" className="flex items-center space-x-2 transition-transform hover:scale-105">
            <Image
              src="/images/agnej.png"
              alt="Agnej Logo"
              width={40}
              height={40}
              className="animate-bounce-slow"
            />
            <span className="text-xl font-bold ml-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent text-glow-blue">Agnej</span>
          </Link>
          <div className="flex items-center space-x-4">
            {isConnected && (
              <Link href="/play" className="hidden md:block text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors">
                Go to Arena →
              </Link>
            )}
            <ConnectButton />
          </div>
        </header>

        <main className="container mx-auto px-6 py-12 md:py-16 relative z-10">
          <div className="text-center mb-12 animate-fadeIn">
            <h1 className="text-6xl md:text-8xl font-bold mb-6 animate-wobble">
              <span className="bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent inline-block transform hover:scale-105 transition-transform duration-300 animate-gradient text-glow-purple">
                AGNEJ
              </span>
            </h1>
            <p className="text-xl md:text-2xl mb-2 text-gray-300 max-w-2xl mx-auto animate-pulse-slow">
              The ultimate physics-based blockchain game
            </p>
            <p className="text-lg text-gray-400 max-w-xl mx-auto mb-8">
              Built on Linea • Play solo or battle friends • Earn real rewards
            </p>

            {/* Contextual Primary CTA */}
            <div className="flex flex-col items-center justify-center gap-4 mb-12">
              <Link
                href="/play"
                className="relative group inline-flex items-center justify-center bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 px-12 py-6 rounded-2xl font-bold text-xl md:text-2xl transition-all active:scale-95 shadow-2xl shadow-blue-900/50 hover:shadow-blue-600/40 transform hover:-translate-y-2"
              >
                <span className="relative z-10">
                  {isConnected ? '🎮 ENTER ARENA' : '🎯 START PLAYING'}
                </span>
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-400 to-purple-400 opacity-0 group-hover:opacity-30 transition-opacity blur-xl -z-10 animate-pulse"></div>
              </Link>
              {!isConnected && (
                <p className="text-sm text-gray-500 animate-fadeIn">
                  Connect your wallet to save progress and earn rewards
                </p>
              )}
            </div>
          </div>

          {/* Interactive Tower Section */}
          <div className="relative mb-20">
            <div className="flex justify-center items-center min-h-[300px] md:min-h-[400px] relative">
              <InteractiveTower />
            </div>
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-gray-400 text-sm animate-bounce flex items-center gap-2">
              <span>Scroll for guide</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 13l5 5 5-5M7 6l5 5 5-5" /></svg>
            </div>
          </div>

          {/* NEW: Step-by-Step Guide */}
          <section className="max-w-4xl mx-auto mb-20 bg-gray-900/40 backdrop-blur-md rounded-3xl p-8 border border-white/10">
            <h2 className="text-3xl font-bold mb-10 text-center bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              How to Get Started
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
              <div className="absolute top-1/2 left-0 w-full h-1 bg-gradient-to-r from-blue-500/0 via-blue-500/20 to-blue-500/0 hidden md:block -translate-y-1/2"></div>

              {[
                {
                  step: '01',
                  title: 'Connect Wallet',
                  desc: 'Pick your favorite Linea-compatible wallet to get started.',
                  icon: '🔌'
                },
                {
                  step: '02',
                  title: 'Select Mode',
                  desc: 'Choose between Solo Practice or High-Stakes Multiplayer.',
                  icon: '🏗️'
                },
                {
                  step: '03',
                  title: 'Earn Rewards',
                  desc: 'Climb the leaderboard and claim your share of the prize pool.',
                  icon: '✨'
                }
              ].map((step, i) => (
                <div key={i} className="relative z-10 flex flex-col items-center text-center group">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 flex items-center justify-center text-3xl mb-4 border border-blue-500/30 group-hover:scale-110 transition-transform duration-300">
                    {step.icon}
                  </div>
                  <div className="text-blue-400 font-mono text-xs font-bold mb-1">{step.step}</div>
                  <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
                  <p className="text-gray-400 text-sm">{step.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Game Modes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-16">
            {['Solo Mode', 'Multiplayer', 'Blockchain'].map((mode, index) => {
              const colors = [
                { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400' },
                { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400' },
                { bg: 'bg-pink-500/10', border: 'border-pink-500/20', text: 'text-pink-400' }
              ]

              const descriptions = [
                'Race against time removing blocks in our challenging solo mode with leaderboard rankings',
                'Battle against up to 6 other players in turn-based tower destruction',
                'Secure on-chain leaderboards and rewards powered by Linea'
              ]

              const icons = ['🏆', '👥', '🔗']

              return (
                <div
                  key={index}
                  className={`${colors[index].bg} backdrop-blur-sm p-6 rounded-xl ${colors[index].border} border hover:border-white/20 transition-all transform hover:scale-105 hover:rotate-1`}
                >
                  <h3 className={`text-xl font-semibold mb-3 ${colors[index].text}`}>
                    {icons[index]} {mode}
                  </h3>
                  <p className="text-gray-300">{descriptions[index]}</p>
                </div>
              )
            })}
          </div>

          {/* Social Proof & Stats */}
          <div className="bg-gray-800/20 backdrop-blur-sm p-8 rounded-xl border border-white/10 max-w-4xl mx-auto mb-16">
            <h3 className="text-xl font-semibold mb-6 text-center text-white">
              🌍 Join the Agnej Community
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              {[
                { label: 'Total Players', value: '1,248+', icon: '👥' },
                { label: 'Games Played', value: '3,892+', icon: '🎮' },
                { label: 'Rewards Distributed', value: '4.2 ETH', icon: '💰' },
                { label: 'Active Tournaments', value: '12', icon: '🏆' }
              ].map((stat, index) => (
                <div key={index} className="p-4">
                  <div className="text-2xl mb-2">{stat.icon}</div>
                  <div className="text-2xl font-bold text-blue-400 mb-1">{stat.value}</div>
                  <div className="text-sm text-gray-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Feature Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
            {[
              {
                title: '🎯 Precision Physics',
                description: 'Realistic 3D physics engine with accurate block interactions and tower dynamics',
                color: 'blue'
              },
              {
                title: '🔗 Blockchain Powered',
                description: 'Secure on-chain leaderboards and transparent reward distribution on Linea',
                color: 'purple'
              },
              {
                title: '📱 Mobile Optimized',
                description: 'Smooth touch controls and responsive design for gaming on the go',
                color: 'pink'
              },
              {
                title: '👥 Social Competition',
                description: 'Challenge friends, join tournaments, and climb the global leaderboards',
                color: 'indigo'
              }
            ].map((feature, index) => {
              const colorClasses = {
                blue: 'border-blue-500/20 text-blue-400',
                purple: 'border-purple-500/20 text-purple-400',
                pink: 'border-pink-500/20 text-pink-400',
                indigo: 'border-indigo-500/20 text-indigo-400'
              }

              const borderClass = colorClasses[feature.color as keyof typeof colorClasses]
              return (
                <div
                  key={index}
                  className={`bg-gray-800/10 backdrop-blur-sm p-6 rounded-xl border ${borderClass} hover:border-white/20 transition-all transform hover:scale-105`}
                >
                  <h4 className={`text-lg font-semibold mb-2 ${borderClass}`}>
                    {feature.title}
                  </h4>
                  <p className="text-gray-300 text-sm">{feature.description}</p>
                </div>
              )
            })}
          </div>

          {/* Final Call to Action */}
          <div className="text-center mb-16 animate-fadeIn">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
              Ready to test your skills?
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Join thousands of players in the ultimate physics-based blockchain challenge
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/play"
                className="relative group inline-flex items-center justify-center bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 px-12 py-6 rounded-xl font-semibold text-lg transition-all active:scale-95 shadow-lg shadow-blue-900/30 hover:shadow-xl hover:shadow-blue-900/40 transform hover:-translate-y-2 animate-bounce-slow"
              >
                <span className="relative z-10">{isConnected ? '🎮 Back to Arena' : '🎮 Start Playing Now'}</span>
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity blur-md -z-10"></div>
              </Link>
              <Link
                href="/leaderboard"
                className="relative group inline-flex items-center justify-center bg-gray-800 hover:bg-gray-700 px-12 py-6 rounded-xl font-semibold text-lg transition-all active:scale-95 border border-gray-700 hover:border-gray-600 transform hover:-translate-y-1"
              >
                <span className="relative z-10">🏆 View Leaderboard</span>
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-gray-700 to-gray-600 opacity-0 group-hover:opacity-20 transition-opacity blur-md -z-10"></div>
              </Link>
            </div>
          </div>

          {/* Testimonials */}
          <div className="bg-gray-800/20 backdrop-blur-sm p-8 rounded-xl border border-white/10 max-w-4xl mx-auto mb-16">
            <h3 className="text-xl font-semibold mb-6 text-center text-white">
              💬 What Players Are Saying
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  quote: '&quot;The physics are incredibly realistic! I love the challenge of solo mode.&quot;',
                  author: '— CryptoGamer23',
                  avatar: '👤'
                },
                {
                  quote: '&quot;Multiplayer is so competitive! The blockchain integration makes it fair and transparent.&quot;',
                  author: '— BlockchainPro',
                  avatar: '👤'
                },
                {
                  quote: '&quot;Best mobile gaming experience I\'ve had with a blockchain game!&quot;',
                  author: '— MobileMaster',
                  avatar: '👤'
                },
                {
                  quote: '&quot;The leaderboard system keeps me coming back for more competition!&quot;',
                  author: '— LeaderboardKing',
                  avatar: '👤'
                }
              ].map((testimonial, index) => (
                <div key={index} className="bg-gray-700/30 p-4 rounded-lg border border-white/10">
                  <div className="flex items-start space-x-3">
                    <div className="text-2xl mt-1">{testimonial.avatar}</div>
                    <div>
                      <p className="text-gray-300 mb-2">"{testimonial.quote}"</p>
                      <p className="text-sm text-gray-400">{testimonial.author}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>

        <footer className="py-8 text-center text-gray-500 text-sm relative z-10">
          <p>© {new Date().getFullYear()} Agnej. Built for the decentralized future.</p>
          <div className="mt-2">
            <Link href="/privacy-policy" className="text-gray-400 hover:text-white transition-colors">
              Privacy Policy
            </Link>
          </div>
        </footer>
      </div>
    </ImmersiveBackground>
  )
}