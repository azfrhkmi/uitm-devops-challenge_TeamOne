'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'
import React, { ChangeEvent, useState } from 'react'
import { ArrowLeft, ShieldAlert } from 'lucide-react'
import BoxError from '@/components/BoxError'
import InputPassword from '@/components/InputPassword'
import InputEmail from '@/components/InputEmail'
import ButtonFilled from '@/components/ButtonFilled'
import useAuthStore from '@/stores/authStore'

interface ModalLogInProps {
  isModal?: boolean
}

function ModalLogIn({ isModal = true }: ModalLogInProps) {
  const {
    email,
    password,
    error,
    setEmail,
    setPassword,
    isLoginFormValid,
    validateToken, // Uses existing validation method
  } = useAuthStore()
  
  const router = useRouter()
  
  // 🛡️ MFA State
  const [showMfaInput, setShowMfaInput] = useState(false)
  const [mfaCode, setMfaCode] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleBackButton = () => {
    router.back()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    setIsSubmitting(true)

    try {
      // 1. Call API directly for the custom MFA flow
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          password, 
          mfaCode: showMfaInput ? mfaCode : undefined 
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        // Handle errors
        if (res.status === 403 && data.message.includes('locked')) {
           setLocalError(data.message) // Account Locked
        } else {
           setLocalError(data.message || 'Login failed')
        }
        setIsSubmitting(false)
        return
      }

      // 🛡️ 2. Check for MFA Requirement (Module 1)
      if (data.requireMfa) {
        setShowMfaInput(true)
        setLocalError(null)
        setIsSubmitting(false) 
        return
      }

      // ✅ 3. Success!
      if (data.data?.token) {
        // Store token
        localStorage.setItem('authToken', data.data.token)
        
        // Sync Store using valid function
        await validateToken() 
        
        // Redirect
        router.push('/') 
      }

    } catch (err) {
      console.error(err)
      setLocalError('Connection error. Please try again.')
      setIsSubmitting(false)
    }
  }

  const containerContent = (
    <div className={clsx([
      isModal ? 'shadow-xl' : 'border border-slate-400',
      'bg-white rounded-3xl max-w-md w-full p-8 transition-all duration-300',
    ])}>
      {/* Header */}
      <div className="text-center mb-6 relative">
        <ArrowLeft onClick={handleBackButton} size={20}
                   className="absolute left-0 top-1 text-slate-800 cursor-pointer hover:text-slate-600" />
        <h2 className="text-xl font-semibold text-slate-900 mb-2">
          {showMfaInput ? 'Security Verification' : 'Log in'}
        </h2>
        <div className="w-full h-px bg-slate-200 mt-4"></div>
      </div>

      {/* Content */}
      <div className="mb-8">
        {(error || localError) && (
          <div className="mb-6">
             <BoxError errorTitle="Login Failed" errorDescription={error || localError || ''} />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* STANDARD LOGIN */}
          {!showMfaInput && (
            <>
              <div>
                 <label className="block text-sm font-medium text-slate-900 mb-2">Email</label>
                 <InputEmail 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    required 
                 />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">Password</label>
                <InputPassword
                  value={password}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  showStrengthIndicator={false}
                />
              </div>
            </>
          )}

          {/* 🛡️ MFA CHALLENGE */}
          {showMfaInput && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-4 text-center">
                 <ShieldAlert className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                 <h3 className="text-blue-900 font-semibold">2-Factor Authentication</h3>
                 <p className="text-xs text-blue-700 mt-1">
                   Enter the 6-digit code from your authenticator app.
                 </p>
              </div>
              
              <label className="block text-sm font-medium text-slate-900 mb-2 text-center">
                Authentication Code
              </label>
              <input 
                type="text" 
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full text-center text-2xl tracking-[0.5em] font-mono py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                placeholder="000000"
                maxLength={6}
                autoFocus
              />
            </div>
          )}

          {/* Submit Button */}
          <ButtonFilled
            type="submit"
            disabled={isSubmitting || (!showMfaInput && !isLoginFormValid())}
          >
            {isSubmitting ? 'Verifying...' : (showMfaInput ? 'Verify Code' : 'Log in')}
          </ButtonFilled>

          {!showMfaInput && (
            <div className="text-center">
              <Link href={'/'} className={'underline text-slate-700 text-sm hover:text-slate-900 transition-colors'}>
                Forgot password?
              </Link>
            </div>
          )}
          
          {showMfaInput && (
             <div className="text-center">
                <button 
                  type="button"
                  onClick={() => setShowMfaInput(false)}
                  className="text-sm text-slate-500 hover:text-slate-800 underline"
                >
                   Back to login
                </button>
             </div>
          )}
        </form>
      </div>
    </div>
  )

  if (isModal) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        {containerContent}
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center p-4">
      {containerContent}
    </div>
  )
}

export default ModalLogIn