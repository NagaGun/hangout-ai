'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { User } from '@supabase/supabase-js'
import AddFriendsModal from '@/components/AddFriendsModal'

const ACTIVITIES = [
    { id: 'food', icon: '🍕', label: 'Food' },
    { id: 'gaming', icon: '🎮', label: 'Gaming' },
    { id: 'movies', icon: '🎬', label: 'Movies' },
    { id: 'sports', icon: '🏀', label: 'Sports' },
    { id: 'party', icon: '🎉', label: 'Party' },
    { id: 'chill', icon: '☕', label: 'Chill' },
    { id: 'surprise', icon: '🎲', label: 'Surprise me' },
]

interface Agent {
    id?: string
    name: string
    avatar_url: string | null
    user_id?: string
}

interface Friend {
    id: string
    agent: Agent
}

export default function NewHangoutPage() {
    const router = useRouter()
    const supabase = createClient()

    const [step, setStep] = useState(1)
    const [user, setUser] = useState<User | null>(null)
    const [myAgent, setMyAgent] = useState<Agent | null>(null)

    // Form State
    const [activity, setActivity] = useState<string | null>(null)
    const [selectedFriends, setSelectedFriends] = useState<string[]>([])

    // Data State
    const [friendsList, setFriendsList] = useState<Friend[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isFetchingData, setIsFetchingData] = useState(true)
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
    const [isFallback, setIsFallback] = useState(false)

    useEffect(() => {
        const init = async () => {
            const { data: { user: authUser } } = await supabase.auth.getUser()
            if (!authUser) {
                router.push('/login')
                return
            }
            setUser(authUser)
            console.log('Current User ID:', authUser.id)

            // Fetch my agent
            const { data: agent } = await supabase
                .from('agents')
                .select('*')
                .eq('user_id', authUser.id)
                .single()

            if (!agent) {
                router.push('/agent/setup')
                return
            }
            setMyAgent(agent as Agent)

            // Fetch only ACCEPTED friends
            const { data: friendships, error: friendError } = await supabase
                .from('friendships')
                .select(`
                    requester_id,
                    addressee_id,
                    status,
                    requester:profiles!requester_id (
                        id,
                        agents (name, avatar_url)
                    ),
                    addressee:profiles!addressee_id (
                        id,
                        agents (name, avatar_url)
                    )
                `)
                .eq('status', 'accepted')
                .or(`requester_id.eq.${authUser.id},addressee_id.eq.${authUser.id}`)

            if (!friendError && friendships && (friendships as any[]).length > 0) {
                const validFriends = (friendships as any[]).map(f => {
                    const friendProfile = f.requester_id === authUser.id ? f.addressee : f.requester
                    const agent = Array.isArray(friendProfile.agents) ? friendProfile.agents[0] : friendProfile.agents
                    return {
                        id: friendProfile.id,
                        agent: agent
                    }
                }).filter(f => f.agent)

                setFriendsList(validFriends as Friend[])
                setIsFallback(false)
            } else {
                // FALLBACK: Fetch all other profiles + agents
                const { data: allProfiles } = await supabase
                    .from('profiles')
                    .select('id, agents(name, avatar_url)')
                    .neq('id', authUser.id)

                if (allProfiles) {
                    const fallbackFriends = allProfiles.map(p => ({
                        id: p.id,
                        agent: Array.isArray(p.agents) ? p.agents[0] : p.agents
                    })).filter(f => f.agent)

                    setFriendsList(fallbackFriends as Friend[])
                    setIsFallback(true)
                }
            }

            setIsFetchingData(false)
        }

        init()
    }, [supabase, router])

    const toggleFriend = (friendId: string) => {
        setSelectedFriends(prev =>
            prev.includes(friendId)
                ? prev.filter(id => id !== friendId)
                : [...prev, friendId]
        )
    }

    const handleSubmit = async () => {
        if (!user || !activity || selectedFriends.length === 0) return

        setIsLoading(true)

        try {
            // Create Hangout
            const { data: hangout, error: hangoutError } = await supabase
                .from('hangouts')
                .insert({
                    creator_id: user.id,
                    activity: activity,
                    status: 'negotiating'
                })
                .select()
                .single()

            if (hangoutError) throw hangoutError

            // Add participants
            const participantsToInsert = selectedFriends.map(friendId => ({
                hangout_id: hangout.id,
                user_id: friendId
            }))

            const { error: participantsError } = await supabase
                .from('hangout_participants')
                .insert(participantsToInsert)

            if (participantsError) throw participantsError

            // INVOKE AI NEGOTIATION
            await supabase.functions.invoke('agent-negotiate', {
                body: { hangout_id: hangout.id }
            })

            router.push(`/hangout/${hangout.id}`)
        } catch (err) {
            const error = err as Error
            console.error('Error creating hangout:', error)
            alert('Failed to start hangout. Please try again.')
            setIsLoading(false)
        }
    }

    if (isFetchingData) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white">
                <div className="h-8 w-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="flex min-h-screen flex-col bg-[#0a0a0a] text-white selection:bg-purple-500/30">
            {/* Navbar Minimal */}
            <nav className="flex items-center justify-between px-8 py-6 border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.push('/')} className="h-10 w-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <span className="font-bold text-lg">Start a Hangout</span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-zinc-500">Step {step} of 3</span>
                </div>
            </nav>

            <main className="flex-1 flex flex-col items-center p-8 pt-12 pb-32">
                <div className="w-full max-w-2xl space-y-12">

                    {/* STEP 1: ACTIVITY */}
                    {step === 1 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="text-center space-y-3">
                                <h1 className="text-4xl font-black tracking-tight">What&apos;s the vibe?</h1>
                                <p className="text-zinc-400 text-lg">Select an activity you want your agent to orchestrate.</p>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {ACTIVITIES.map((act) => (
                                    <button
                                        key={act.id}
                                        onClick={() => {
                                            setActivity(act.id)
                                            setStep(2)
                                        }}
                                        className={`relative p-6 rounded-3xl border transition-all duration-300 flex flex-col items-center justify-center gap-4 group ${activity === act.id
                                            ? 'border-purple-500 bg-purple-500/10 scale-[1.02]'
                                            : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'
                                            }`}
                                    >
                                        <span className="text-5xl group-hover:scale-110 transition-transform duration-300">{act.icon}</span>
                                        <span className="font-bold text-lg">{act.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* STEP 2: FRIENDS */}
                    {step === 2 && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="text-center space-y-3 relative">
                                <h1 className="text-4xl font-black tracking-tight">Who&apos;s invited?</h1>
                                <p className="text-zinc-400 text-lg">Select friends to coordinate with.</p>
                                <button
                                    onClick={() => setIsInviteModalOpen(true)}
                                    className="absolute right-0 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
                                    title="Add Friend"
                                >
                                    <svg className="w-5 h-5 text-zinc-400 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                </button>
                            </div>

                            <div className="space-y-4">
                                {isFallback && friendsList.length > 0 && (
                                    <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-500">
                                        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Add friends via invite to restrict this list. Showing all users for testing.
                                    </div>
                                )}
                                {friendsList.length === 0 ? (
                                    <div className="text-center p-12 border border-dashed border-white/10 rounded-[2.5rem] bg-white/[0.02] flex flex-col items-center gap-6">
                                        <div className="h-20 w-20 bg-white/5 rounded-full flex items-center justify-center text-3xl">
                                            🤝
                                        </div>
                                        <div className="space-y-2">
                                            <p className="text-xl font-bold">No friends yet</p>
                                            <p className="text-zinc-500">Invite them to the network to start coordinating.</p>
                                        </div>
                                        <button
                                            onClick={() => setIsInviteModalOpen(true)}
                                            className="px-6 py-3 rounded-xl bg-white text-black text-sm font-bold hover:scale-105 transition-all flex items-center gap-2"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                            </svg>
                                            Invite Friends
                                        </button>
                                    </div>
                                ) : (
                                    friendsList.map(({ id, agent }) => {
                                        const isSelected = selectedFriends.includes(id)
                                        return (
                                            <button
                                                key={id}
                                                onClick={() => toggleFriend(id)}
                                                className={`w-full flex items-center p-4 rounded-3xl border transition-all duration-300 ${isSelected
                                                    ? 'border-blue-500 bg-blue-500/10'
                                                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                                                    }`}
                                            >
                                                <div className="relative h-14 w-14 rounded-full border border-white/10 overflow-hidden bg-black flex-shrink-0">
                                                    {agent?.avatar_url ? (
                                                        <Image
                                                            src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${agent.avatar_url}`}
                                                            alt={agent.name}
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-xl font-bold text-zinc-600 bg-white/5">
                                                            {agent?.name ? agent.name[0] : '?'}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="ml-4 flex-1 text-left">
                                                    <p className="font-bold text-lg">{agent?.name || 'Unknown Agent'}</p>
                                                    <p className="text-sm text-zinc-500">AI Coordinator</p>
                                                </div>
                                                <div className={`h-6 w-6 rounded-full border flex items-center justify-center transition-colors ${isSelected ? 'border-blue-500 bg-blue-500' : 'border-white/20 bg-black'
                                                    }`}>
                                                    {isSelected && (
                                                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    )}
                                                </div>
                                            </button>
                                        )
                                    })
                                )}
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    onClick={() => setStep(1)}
                                    className="flex-1 px-6 py-4 rounded-2xl border border-white/10 font-bold text-zinc-300 hover:bg-white/5 transition-colors"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={() => setStep(3)}
                                    disabled={selectedFriends.length === 0}
                                    className="flex-[2] px-6 py-4 rounded-2xl bg-white text-black font-black text-lg disabled:opacity-50 disabled:bg-white/50 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    Continue
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: CONFIRM */}
                    {step === 3 && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="text-center space-y-3">
                                <h1 className="text-4xl font-black tracking-tight">Deploy Agent</h1>
                                <p className="text-zinc-400 text-lg">Review details before sending <strong className="text-purple-400 font-bold">{myAgent?.name}</strong> to negotiate.</p>
                            </div>

                            <div className="p-8 rounded-[2.5rem] border border-white/10 bg-white/5 space-y-8 backdrop-blur-xl relative overflow-hidden">
                                <div className="absolute top-[-50%] right-[-10%] w-[80%] h-[100%] bg-purple-600/10 blur-[100px] rounded-full pointer-events-none" />

                                <div className="relative space-y-2">
                                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Activity</p>
                                    <p className="text-3xl font-black">
                                        {ACTIVITIES.find(a => a.id === activity)?.icon} {ACTIVITIES.find(a => a.id === activity)?.label}
                                    </p>
                                </div>

                                <div className="relative space-y-4">
                                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Coordinating With</p>
                                    <div className="flex flex-wrap gap-3">
                                        {selectedFriends.map(id => {
                                            const friend = friendsList.find(f => f.id === id)
                                            if (!friend) return null
                                            return (
                                                <div key={id} className="flex items-center gap-2 pr-4 py-1.5 pl-1.5 rounded-full border border-white/10 bg-black/50">
                                                    <div className="relative h-8 w-8 rounded-full overflow-hidden border border-white/10">
                                                        {friend.agent?.avatar_url ? (
                                                            <Image
                                                                src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${friend.agent.avatar_url}`}
                                                                alt={friend.agent.name}
                                                                fill
                                                                className="object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full bg-white/10 flex items-center justify-center font-bold text-xs">
                                                                {friend.agent?.name?.[0]}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span className="font-semibold text-sm">{friend.agent?.name}</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => setStep(2)}
                                    className="flex-1 px-6 py-4 rounded-2xl border border-white/10 font-bold text-zinc-300 hover:bg-white/5 transition-colors"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={isLoading}
                                    className="flex-[2] relative group px-6 py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-black text-lg shadow-xl shadow-purple-500/20 hover:shadow-purple-500/40 transition-all hover:-translate-y-1 active:translate-y-0 disabled:opacity-70 disabled:hover:translate-y-0 overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-white/20 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500" />
                                    <span className="relative z-10 flex items-center justify-center gap-3">
                                        {isLoading ? (
                                            <div className="h-6 w-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            `Let ${myAgent?.name} handle it`
                                        )}
                                    </span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Decorative Grid */}
            <div
                className="fixed inset-0 pointer-events-none opacity-[0.015] -z-10"
                style={{
                    backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
                    backgroundSize: '48px 48px'
                }}
            />
            <AddFriendsModal
                isOpen={isInviteModalOpen}
                onClose={() => setIsInviteModalOpen(false)}
            />
        </div>
    )
}
