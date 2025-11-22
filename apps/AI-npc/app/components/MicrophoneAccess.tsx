'use client'

import { useState, useEffect } from 'react'

type PermissionState = 'prompt' | 'granted' | 'denied' | 'unavailable'

export default function MicrophoneAccess() {
  const [permissionState, setPermissionState] = useState<PermissionState>('prompt')
  const [isRequesting, setIsRequesting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)

  useEffect(() => {
    // Check if microphone permission API is available
    if (typeof navigator !== 'undefined' && 'permissions' in navigator) {
      checkPermission()
    }
  }, [])

  const checkPermission = async () => {
    try {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName })
      setPermissionState(result.state as PermissionState)
      
      result.onchange = () => {
        setPermissionState(result.state as PermissionState)
      }
    } catch (err) {
      // Permission API might not be supported, that's okay
      console.log('Permission API not fully supported')
    }
  }

  const requestMicrophoneAccess = async () => {
    setIsRequesting(true)
    setError(null)

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      setStream(mediaStream)
      setPermissionState('granted')
      
      // Stop the stream immediately - we just needed permission
      mediaStream.getTracks().forEach(track => track.stop())
      setStream(null)
      
      // Update permission state check
      if (typeof navigator !== 'undefined' && 'permissions' in navigator) {
        checkPermission()
      }
    } catch (err: any) {
      console.error('Error requesting microphone access:', err)
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionState('denied')
        setError('Microphone access was denied. Please allow microphone access in your browser settings.')
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setPermissionState('unavailable')
        setError('No microphone found. Please connect a microphone and try again.')
      } else {
        setError('Failed to access microphone. Please check your browser settings.')
        setPermissionState('denied')
      }
    } finally {
      setIsRequesting(false)
    }
  }

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [stream])

  // Don't show anything if permission is already granted
  if (permissionState === 'granted') {
    return null
  }

  return (
    <div className="microphone-access">
      <div className="microphone-access-content">
        {permissionState === 'denied' ? (
          <>
            <div className="microphone-icon">🎤</div>
            <h3>Microphone Access Required</h3>
            <p>{error || 'Microphone access is required for this application. Please enable it in your browser settings.'}</p>
            <button 
              onClick={requestMicrophoneAccess}
              disabled={isRequesting}
              className="microphone-button"
            >
              {isRequesting ? 'Requesting...' : 'Try Again'}
            </button>
          </>
        ) : (
          <>
            <div className="microphone-icon">🎤</div>
            <h3>Microphone Access Required</h3>
            <p>This application needs access to your microphone to function properly.</p>
            <button 
              onClick={requestMicrophoneAccess}
              disabled={isRequesting}
              className="microphone-button"
            >
              {isRequesting ? 'Requesting Access...' : 'Allow Microphone Access'}
            </button>
          </>
        )}
        {error && permissionState !== 'denied' && (
          <p className="error-message">{error}</p>
        )}
      </div>
    </div>
  )
}

