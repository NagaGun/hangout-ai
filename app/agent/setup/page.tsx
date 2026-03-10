'use client'

import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { User } from '@supabase/supabase-js'

export default function AgentSetupPage() {
    const [agentName, setAgentName] = useState('')
    const [avatarFile, setAvatarFile] = useState<File | null>(null)
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [user, setUser] = useState<User | null>(null)

    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        const checkAgent = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
                return
            }
            setUser(user)

            // Check if agent already exists
            const { data: agent } = await supabase
                .from('agents')
                .select('id')
                .eq('user_id', user.id)
                .single()

            if (agent) {
                router.push('/')
            }
        }
        checkAgent()
    }, [supabase, router])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0]
            setAvatarFile(file)
            setAvatarUrl(URL.createObjectURL(file))
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return

        setIsLoading(true)
        setError(null)

        try {
            let avatarPath = null

            if (avatarFile) {
                const fileExt = avatarFile.name.split('.').pop()
                const fileName = `${Math.random()}.${fileExt}`
                const filePath = `${user.id}/${fileName}`

                try {
                    const { error: uploadError } = await supabase.storage
                        .from('avatars')
                        .upload(filePath, avatarFile)

                    if (uploadError) {
                        console.error('Avatar upload failed:', uploadError)
                    } else {
                        avatarPath = filePath
                    }
                } catch (err) {
                    console.error('Avatar upload exception:', err)
                    // Proceeding without avatarPath
                }
            }

            const { error: insertError } = await supabase
                .from('agents')
                .insert({
                    user_id: user.id,
                    name: agentName,
                    avatar_url: avatarPath,
                })

            if (insertError) throw insertError

            router.push('/')
            router.refresh()
        } catch (err) {
            const error = err as Error
            setError(error.message || 'An error occurred while setting up your agent')
        } finally {
            setIsLoading(false)
        }
    }

    if (!user) return null

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0a] text-white selection:bg-purple-500/30">
            {/* Background Glow */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[120px] rounded-full" />
            </div>

            <div className="z-10 w-full max-w-xl px-8 py-12 rounded-[2.5rem] border border-white/10 bg-white/5 backdrop-blur-2xl shadow-2xl space-y-10">
                <div className="text-center space-y-3">
                    <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-white/10 mb-2">
                        <svg viewBox="0 0 24 24" className="w-8 h-8 text-white fill-current">
                            <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
                        </svg>
                    </div>
                    <h1 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70">
                        Initialize Your Agent
                    </h1>
                    <p className="text-zinc-400 text-lg font-medium">
                        Give your personal AI coordinator an identity.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Avatar Upload */}
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-500"></div>
                            <div className="relative h-32 w-32 rounded-full border-2 border-dashed border-white/20 bg-white/5 flex items-center justify-center overflow-hidden transition-all group-hover:border-white/40">
                                {avatarUrl ? (
                                    <Image
                                        src={avatarUrl}
                                        alt="Avatar preview"
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <svg className="w-10 h-10 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                                    </svg>
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                            </div>
                        </div>
                        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Agent Avatar</p>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-zinc-500 ml-1 uppercase tracking-wider">Agent Name</label>
                            <input
                                type="text"
                                required
                                value={agentName}
                                onChange={(e) => setAgentName(e.target.value)}
                                placeholder="e.g. Nexus, Sentinel, Jarvis..."
                                className="w-full h-14 px-5 rounded-2xl bg-white/[0.03] border border-white/10 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 outline-none transition-all text-lg placeholder:text-zinc-600"
                            />
                        </div>

                        {error && (
                            <p className="text-red-400 text-sm text-center font-medium bg-red-400/10 py-3 rounded-xl border border-red-400/20">
                                {error}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading || !agentName}
                            className="group relative flex items-center justify-center gap-3 w-full h-16 bg-white text-black font-bold text-lg rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 overflow-hidden"
                        >
                            {isLoading ? (
                                <div className="h-6 w-6 border-3 border-black/30 border-t-black rounded-full animate-spin" />
                            ) : (
                                'Finalize Setup'
                            )}

                            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-700" />
                        </button>
                    </div>
                </form>
            </div>

            {/* Dynamic Grid Overlay */}
            <div
                className="fixed inset-0 pointer-events-none opacity-[0.02]"
                style={{
                    backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
                    backgroundSize: '64px 64px'
                }}
            />
        </div>
    )
}
