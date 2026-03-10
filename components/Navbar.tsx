'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import AddFriendsModal from './AddFriendsModal'

interface NavbarProps {
    agentName: string
    agentAvatar: string | null
    email: string
}

export default function Navbar({ agentName, agentAvatar, email }: NavbarProps) {
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
    const supabase = createClient()
    const router = useRouter()

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    return (
        <>
            <nav className="flex items-center justify-between px-8 py-6 border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <Link href="/" className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current">
                                <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
                            </svg>
                        </div>
                        <span className="font-bold text-xl tracking-tight">Hangout AI</span>
                    </Link>
                </div>

                <div className="flex items-center gap-6">
                    <button
                        onClick={() => setIsInviteModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-sm font-semibold"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add Friend
                    </button>

                    <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-sm font-semibold text-zinc-300">
                            {agentName} is online
                        </span>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 text-sm font-semibold rounded-xl border border-white/10 hover:bg-white/5 transition-colors"
                    >
                        Log out
                    </button>
                </div>
            </nav>

            <AddFriendsModal
                isOpen={isInviteModalOpen}
                onClose={() => setIsInviteModalOpen(false)}
            />
        </>
    )
}
