import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { phone_number } = await req.json()
        const token = uuidv4()

        const { data, error } = await supabase
            .from('invites')
            .insert({
                sender_id: user.id,
                token,
                phone_number: phone_number || null,
                status: 'pending'
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ token: data.token })
    } catch (error) {
        console.error('Error creating invite:', error)
        return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 })
    }
}
