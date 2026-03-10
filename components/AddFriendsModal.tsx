'use client'

import { useState } from 'react'

interface AddFriendsModalProps {
    isOpen: boolean
    onClose: () => void
}

export default function AddFriendsModal({ isOpen, onClose }: AddFriendsModalProps) {
    const [phoneNumber, setPhoneNumber] = useState('')
    const [inviteLink, setInviteLink] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [copySuccess, setCopySuccess] = useState(false)

    if (!isOpen) return null

    const handleGenerateInvite = async () => {
        setIsLoading(true)
        try {
            const res = await fetch('/api/invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone_number: phoneNumber || undefined })
            })
            const data = await res.json()
            if (data.token) {
                const url = `${window.location.origin}/join/${data.token}`
                setInviteLink(url)
            }
        } catch (error) {
            console.error('Error creating invite:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const copyToClipboard = () => {
        navigator.clipboard.writeText(inviteLink)
        setCopySuccess(true)
        setTimeout(() => setCopySuccess(false), 2000)
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md scale-in-center overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#0f0f0f] p-8 shadow-2xl space-y-8 animate-in fade-in zoom-in duration-300">
                <div className="space-y-2">
                    <h2 className="text-2xl font-black tracking-tight">Expand Your Network</h2>
                    <p className="text-zinc-500 text-sm font-medium leading-relaxed">
                        Invite friends to coordinate with their AI agents. Once they join, you&apos;ll be automatically connected.
                    </p>
                </div>

                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Phone Number (Optional)</label>
                        <input
                            type="tel"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder="+1 (555) 000-0000"
                            className="w-full h-12 px-4 rounded-xl bg-white/[0.03] border border-white/10 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 outline-none transition-all placeholder:text-zinc-700 font-mono"
                        />
                    </div>

                    {!inviteLink ? (
                        <button
                            onClick={handleGenerateInvite}
                            disabled={isLoading}
                            className="w-full h-14 rounded-2xl bg-white text-black font-black text-lg hover:scale-[1.02] transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
                        >
                            {isLoading ? (
                                <div className="h-5 w-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                    Generate Invite Link
                                </>
                            )}
                        </button>
                    ) : (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-3">
                                <p className="text-xs font-mono text-zinc-400 truncate">{inviteLink}</p>
                                <button
                                    onClick={copyToClipboard}
                                    className="flex-shrink-0 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                                >
                                    {copySuccess ? (
                                        <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                        </svg>
                                    ) : (
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                            <p className="text-[10px] text-center text-zinc-600 font-bold uppercase tracking-widest">Link generated! Copy and send to your friend.</p>
                        </div>
                    )}
                </div>

                <button
                    onClick={onClose}
                    className="w-full text-zinc-600 font-bold text-sm hover:text-zinc-400 transition-colors py-2"
                >
                    Close
                </button>
            </div>
        </div>
    )
}
