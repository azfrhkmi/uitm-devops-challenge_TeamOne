'use client'

import React from 'react'
import ContentWrapper from '@/components/ContentWrapper'
import MFASetup from '@/components/MFASetup'
import { KeyRound, History } from 'lucide-react'

export default function SecurityPage() {
  return (
    <ContentWrapper>
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-bold text-slate-900">Login & Security</h1>
          <p className="text-slate-600 mt-2">Manage your password and security settings.</p>
        </div>

        <div className="grid gap-8">
          
          {/* MFA Section (The Star of Module 1) */}
          <section>
            <MFASetup />
          </section>

          {/* Password Section (Visual placeholder for completeness) */}
          <section className="bg-white border border-slate-200 rounded-2xl p-8 opacity-75">
             <div className="flex justify-between items-center">
                <div className="flex gap-4">
                   <div className="p-3 bg-slate-100 rounded-xl">
                      <KeyRound className="w-6 h-6 text-slate-600" />
                   </div>
                   <div>
                      <h3 className="font-bold text-slate-900">Password</h3>
                      <p className="text-sm text-slate-500">Last changed 3 months ago</p>
                   </div>
                </div>
                <button className="text-teal-600 font-medium hover:underline">Update</button>
             </div>
          </section>

           {/* Activity Section */}
           <section className="bg-white border border-slate-200 rounded-2xl p-8 opacity-75">
             <div className="flex justify-between items-center">
                <div className="flex gap-4">
                   <div className="p-3 bg-slate-100 rounded-xl">
                      <History className="w-6 h-6 text-slate-600" />
                   </div>
                   <div>
                      <h3 className="font-bold text-slate-900">Login History</h3>
                      <p className="text-sm text-slate-500">Review your recent sessions</p>
                   </div>
                </div>
                <button className="text-teal-600 font-medium hover:underline">View</button>
             </div>
          </section>

        </div>
      </div>
    </ContentWrapper>
  )
}