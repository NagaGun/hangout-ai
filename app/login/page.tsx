'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [mode, setMode] = useState<'signin' | 'signup'>('signin')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const supabase = createClient()
    const router = useRouter()

    // Check for invite token in URL
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
    const inviteToken = searchParams?.get('invite')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        try {
            if (mode === 'signin') {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                })
                if (error) throw error

                // If we have an invite token, redirect to the join page
                if (inviteToken) {
                    router.push(`/join/${inviteToken}`)
                } else {
                    router.push('/')
                }
                router.refresh()
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${window.location.origin}/auth/callback${inviteToken ? `?invite=${inviteToken}` : ''}`,
                    },
                })
                if (error) throw error
                alert('Check your email for the confirmation link (if enabled in Supabase)!')
            }
        } catch (err) {
            const error = err as Error
            setError(error.message || 'An error occurred')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0a] text-white selection:bg-purple-500/30">
            {/* Background Glow */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full" />
            </div>

            <div className="z-10 w-full max-w-md px-8 py-12 rounded-[2.5rem] border border-white/10 bg-white/5 backdrop-blur-2xl shadow-2xl space-y-8">
                <div className="flex flex-col items-center gap-6">
                    {/* Logo/Icon */}
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur opacity-40 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                        <div className="relative h-14 w-14 bg-black rounded-2xl flex items-center justify-center border border-white/10 ring-1 ring-white/5">
                            <svg
                                viewBox="0 0 24 24"
                                className="w-7 h-7 text-white fill-current"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
                            </svg>
                        </div>
                    </div>

                    <div className="text-center space-y-2">
                        <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70">
                            {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
                        </h1>
                        <p className="text-zinc-400 text-sm font-medium">
                            {mode === 'signin' ? 'Sign in to coordinate with Hangout AI' : 'Start your journey with a personal AI agent'}
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-zinc-500 ml-1 uppercase tracking-wider">Email Address</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@example.com"
                            className="w-full h-12 px-4 rounded-xl bg-white/[0.03] border border-white/10 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 outline-none transition-all placeholder:text-zinc-600"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-zinc-500 ml-1 uppercase tracking-wider">Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full h-12 px-4 rounded-xl bg-white/[0.03] border border-white/10 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 outline-none transition-all placeholder:text-zinc-600"
                        />
                    </div>

                    {error && (
                        <p className="text-red-400 text-xs text-center font-medium bg-red-400/10 py-2 rounded-lg border border-red-400/20">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="group relative flex items-center justify-center gap-2 w-full h-12 bg-white text-black font-bold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100 overflow-hidden"
                    >
                        {isLoading ? (
                            <div className="h-4 w-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        ) : (
                            mode === 'signin' ? 'Sign In' : 'Create Account'
                        )}

                        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
                    </button>
                </form>

                <div className="pt-4 text-center">
                    <button
                        onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                        className="text-sm text-zinc-500 hover:text-white transition-colors font-medium decoration-zinc-500/30 underline-offset-4 hover:underline"
                    >
                        {mode === 'signin' ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                    </button>
                </div>
            </div>

            {/* Dynamic Grid Overlay */}
            <div
                className="fixed inset-0 pointer-events-none opacity-[0.02]"
                style={{
                    backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
                    backgroundSize: '48px 48px'
                }}
            />
        </div>
    )
}
