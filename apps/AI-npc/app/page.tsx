'use client'

import GameIframe from './components/GameIframe'
import MicrophoneAccess from './components/MicrophoneAccess'
import { AccessCodeGate } from './components/AccessCodeGate'

function HomeContent() {
  return (
    <main className="container">
      <div className="iframe-wrapper">
        <MicrophoneAccess />
        <GameIframe />
        <footer className="footer">
          <p>© 2025 AI Avatar Closed. All rights reserved.</p>
        </footer>
      </div>
    </main>
  )
}

export default function Home() {
  return (
    <AccessCodeGate requiredRole="user">
      <HomeContent />
    </AccessCodeGate>
  )
}

