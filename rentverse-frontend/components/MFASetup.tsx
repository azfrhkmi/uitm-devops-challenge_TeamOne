'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { ShieldCheck, Smartphone, AlertCircle, CheckCircle, Copy } from 'lucide-react'
import ButtonFilled from '@/components/ButtonFilled'
import useAuthStore from '@/stores/authStore'

function MFASetup() {
  const { user } = useAuthStore()
  const [step, setStep] = useState<'initial' | 'scan' | 'success'>('initial')
  const [qrCode, setQrCode] = useState<string>('')
  const [secret, setSecret] = useState<string>('')
  const [verifyCode, setVerifyCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // 1. Start Setup: Get QR Code from Backend
  const handleStartSetup = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem('authToken')
      const res = await fetch('/api/auth/mfa/setup', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!res.ok) throw new Error('Failed to start MFA setup')
      
      const data = await res.json()
      if (data.success) {
        setQrCode(data.data.qrCode)
        setSecret(data.data.secret)
        setStep('scan')
      }
    } catch (err) {
      setError('Could not generate QR code. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // 2. Verify and Enable
  const handleVerify = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem('authToken')
      const res = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 
           'Authorization': `Bearer ${token}`,
           'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ token: verifyCode })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Verification failed')

      if (data.success) {
        setStep('success')
        // Ideally update the user store here to reflect mfaEnabled = true
      }
    } catch (err: any) {
      setError(err.message || 'Invalid code. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (step === 'initial') {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-2xl">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-teal-50 rounded-xl">
            <ShieldCheck className="w-8 h-8 text-teal-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Two-Factor Authentication</h2>
            <p className="text-slate-600 mt-1 mb-6">
              Add an extra layer of security to your account. We will ask for a code from your authenticator app when you log in.
            </p>
            
            {user?.mfaEnabled ? (
               <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                  <CheckCircle className="text-green-600 w-5 h-5" />
                  <span className="text-green-800 font-medium">MFA is currently enabled on your account.</span>
               </div>
            ) : (
               <ButtonFilled onClick={handleStartSetup} disabled={isLoading} className="w-auto px-8">
                 {isLoading ? 'Loading...' : 'Enable 2FA'}
               </ButtonFilled>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (step === 'scan') {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-2xl">
        <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <Smartphone className="text-teal-600" />
          Setup Authenticator
        </h2>

        <div className="grid md:grid-cols-2 gap-8 items-center">
           {/* QR Section */}
           <div className="flex flex-col items-center p-6 bg-slate-50 rounded-xl border border-slate-100">
              {qrCode && (
                <Image 
                  src={qrCode} 
                  alt="MFA QR Code" 
                  width={180} 
                  height={180} 
                  className="rounded-lg mb-4 mix-blend-multiply"
                />
              )}
              <p className="text-xs text-slate-500 text-center mb-2">Can't scan?</p>
              <code className="bg-white px-3 py-1 rounded border border-slate-200 text-xs font-mono flex items-center gap-2">
                {secret} <Copy size={10} className="cursor-pointer hover:text-teal-600" />
              </code>
           </div>

           {/* Verify Section */}
           <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  1. Scan QR with Google Authenticator
                </label>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  2. Enter the 6-digit code
                </label>
                <input
                  type="text"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g,'').slice(0,6))}
                  className="w-full text-center text-2xl tracking-[0.5em] font-mono py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none mb-2"
                  placeholder="000000"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-2 rounded-lg">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button 
                  onClick={() => setStep('initial')}
                  className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <ButtonFilled 
                  onClick={handleVerify} 
                  disabled={verifyCode.length !== 6 || isLoading}
                >
                  {isLoading ? 'Verifying...' : 'Activate'}
                </ButtonFilled>
              </div>
           </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-10 max-w-2xl text-center">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle className="w-8 h-8 text-green-600" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Secure & Ready!</h2>
      <p className="text-slate-600 mb-8">
        Two-factor authentication has been successfully enabled. Your account is now protected with military-grade security.
      </p>
      <ButtonFilled onClick={() => setStep('initial')} className="w-full md:w-auto px-10">
        Done
      </ButtonFilled>
    </div>
  )
}

export default MFASetup