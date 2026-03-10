import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function JoinPage({ params }: { params: { token: string } }) {
    const supabase = await createClient()
    const { token } = params

    // 1. Verify token exists and is pending
    const { data: invite, error } = await supabase
        .from('invites')
        .select('*')
        .eq('token', token)
        .eq('status', 'pending')
        .single()

    if (error || !invite) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white p-8 text-center">
                <div className="space-y-4">
                    <h1 className="text-4xl font-black">Invite Invalid</h1>
                    <p className="text-zinc-500">This invite link has expired or is invalid.</p>
                    <a href="/" className="text-purple-400 hover:underline">Back to Home</a>
                </div>
            </div>
        )
    }

    // 2. Check if user is already logged in
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
        // If it's the sender themselves, just redirect home
        if (user.id === invite.sender_id) {
            redirect('/')
        }

        // Create the friendship
        const { error: friendshipError } = await supabase
            .from('friendships')
            .upsert({
                requester_id: invite.sender_id,
                addressee_id: user.id,
                status: 'accepted'
            })

        if (!friendshipError) {
            // Update invite status
            await supabase.from('invites').update({ status: 'accepted' }).eq('id', invite.id)
            redirect('/?connected=true')
        }
    }

    // 3. User is not logged in, redirect to login with invite param
    redirect(`/login?invite=${token}`)
}
