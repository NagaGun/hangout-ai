'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import Image from 'next/image'

interface Negotiation {
    id: string
    round: number
    proposal: {
        message: string
        agreed_time?: string
    }
    status: string
    created_at: string
}

interface Hangout {
    id: string
    activity: string
    status: string
    confirmed_time: string | null
}

export default function HangoutStatusPage() {
    const { id } = useParams()
    const router = useRouter()
    const supabase = createClient()
    const [hangout, setHangout] = useState<Hangout | null>(null)
    const [negotiations, setNegotiations] = useState<Negotiation[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const fetchInitialData = async () => {
            const { data: hangoutData } = await supabase
                .from('hangouts')
                .select('*')
                .eq('id', id)
                .single()

            if (hangoutData) {
                setHangout(hangoutData)
            }

            const { data: negs } = await supabase
                .from('negotiations')
                .select('*')
                .eq('hangout_id', id)
                .order('round', { ascending: true })

            if (negs) {
                setNegotiations(negs)
            }
            setIsLoading(false)
        }

        fetchInitialData()

        // Subscribe to real-time updates for negotiations
        const channel = supabase
            .channel(`hangout:${id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'negotiations',
                    filter: `hangout_id=eq.${id}`,
                },
                (payload) => {
                    setNegotiations((prev) => [...prev, payload.new as Negotiation])
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'hangouts',
                    filter: `id=eq.${id}`,
                },
                (payload) => {
                    setHangout(payload.new as Hangout)
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [id, supabase])

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
                <div className="h-8 w-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
            </div>
        )
    }

    const isConfirmed = hangout?.status === 'confirmed'

    const generateGoogleCalendarLink = () => {
        if (!hangout || !hangout.confirmed_time) return '#'
        const title = `Hangout: ${hangout.activity}`
        const details = `Coordinated by Hangout AI`
        return `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&details=${encodeURIComponent(details)}`
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-purple-500/30 font-sans">
            <nav className="flex items-center px-8 py-6 border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-50">
                <button onClick={() => router.push('/')} className="h-10 w-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors mr-4">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <h1 className="text-xl font-bold">Coordination Status</h1>
            </nav>

            <main className="max-w-3xl mx-auto p-8 pt-16 space-y-12">
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold uppercase tracking-widest">
                        {isConfirmed ? '✅ Confirmed' : '🤖 Negotiating'}
                    </div>
                    <h2 className="text-5xl font-black tracking-tight tracking-tighter">
                        {isConfirmed ? 'It\'s a Date!' : 'Agents are Talking...'}
                    </h2>
                    <p className="text-zinc-500 text-lg">
                        {isConfirmed
                            ? `Your agents have finalized the ${hangout?.activity} hangout.`
                            : `Our AI agents are hashing out the details for your ${hangout?.activity} hangout.`
                        }
                    </p>
                </div>

                <div className="space-y-6 relative">
                    {/* Living connecting line */}
                    {!isConfirmed && (
                        <div className="absolute left-[27px] top-6 bottom-6 w-[2px] bg-gradient-to-b from-purple-500/50 via-blue-500/50 to-transparent animate-pulse" />
                    )}

                    {negotiations.map((neg, i) => (
                        <div
                            key={neg.id}
                            className="flex gap-6 items-start animate-in fade-in slide-in-from-left-4 duration-500 fill-mode-both"
                            style={{ animationDelay: `${i * 150}ms` }}
                        >
                            <div className="relative z-10 h-14 w-14 rounded-full border border-white/10 bg-[#111] border-2 border-white/10 flex items-center justify-center shrink-0">
                                <div className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
                            </div>
                            <div className="flex-1 pt-2 space-y-1">
                                <div className="flex items-center justify-between">
                                    <p className="font-bold text-zinc-300">Phase {neg.round}</p>
                                    <span className="text-[10px] text-zinc-600 font-mono uppercase font-bold">
                                        {new Date(neg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div className="p-5 rounded-3xl rounded-tl-none border border-white/5 bg-white/[0.03] text-zinc-400 leading-relaxed ring-1 ring-white/5">
                                    {neg.proposal.message}
                                </div>
                            </div>
                        </div>
                    ))}

                    {isConfirmed && (
                        <div className="animate-in zoom-in fade-in duration-700">
                            <div className="p-10 rounded-[3rem] border-2 border-purple-500/30 bg-gradient-to-br from-purple-600/10 to-blue-600/10 backdrop-blur-xl space-y-8 text-center relative overflow-hidden group">
                                <div className="absolute -top-24 -right-24 w-64 h-64 bg-purple-500/20 blur-[100px] rounded-full" />

                                <div className="space-y-2 relative">
                                    <p className="text-xs font-black text-purple-400 uppercase tracking-[0.2em]">Finalized Time</p>
                                    <p className="text-5xl font-black text-white">{hangout?.confirmed_time}</p>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-4 pt-4 relative">
                                    <a
                                        href={generateGoogleCalendarLink()}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 h-14 rounded-2xl bg-white text-black font-black text-lg flex items-center justify-center gap-3 hover:scale-[1.03] transition-all active:scale-[0.97]"
                                    >
                                        <svg className="w-5 h-5 text-zinc-700" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zm-8 4H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z" />
                                        </svg>
                                        Add to Calendar
                                    </a>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Decorative background */}
            <div className="fixed inset-0 -z-50 pointer-events-none overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-purple-600/5 blur-[150px] rounded-full animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-600/5 blur-[150px] rounded-full animate-pulse delay-700" />
            </div>
        </div>
    )
}
