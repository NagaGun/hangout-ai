import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
    const { hangout_id } = await req.json()
    const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get hangout details
    const { data: hangout, error: fetchError } = await supabase
        .from('hangouts')
        .select('*, hangout_participants(*, profiles(*, agents(*)))')
        .eq('id', hangout_id)
        .single()

    if (fetchError || !hangout) {
        return new Response(JSON.stringify({ error: 'Hangout not found' }), { status: 404 })
    }

    // Mock availability for each participant
    const availability = {
        slots: ['Saturday 6pm', 'Saturday 8pm', 'Sunday 3pm', 'Sunday 6pm']
    }

    // Call Gemini to negotiate
    const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${Deno.env.get('GEMINI_API_KEY')}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `You are an AI agent negotiating a hangout time.
            Activity: ${hangout.activity}
            Participants: ${hangout.hangout_participants.length} people
            Available slots: ${availability.slots.join(', ')}
            
            Pick the best time slot for a ${hangout.activity} hangout.
            Respond with ONLY a JSON object like this:
            {"agreed_time": "Saturday 8pm", "message": "Your agents agreed on Saturday 8pm for ${hangout.activity}!"}`
                    }]
                }]
            })
        }
    )

    const geminiData = await geminiRes.json()
    const text = geminiData.candidates[0].content.parts[0].text
    const result = JSON.parse(text.replace(/```json|```/g, '').trim())

    // Write negotiation rounds to show progress
    await supabase.from('negotiations').insert([
        {
            hangout_id, from_agent_id: hangout.hangout_participants[0].profiles.agents[0].id,
            proposal: { message: 'Checking availability...', round: 1 }, round: 1, status: 'pending'
        },
        {
            hangout_id, from_agent_id: hangout.hangout_participants[0].profiles.agents[0].id,
            proposal: { message: 'Found overlap in schedules...', round: 2 }, round: 2, status: 'pending'
        },
        {
            hangout_id, from_agent_id: hangout.hangout_participants[0].profiles.agents[0].id,
            proposal: { message: result.message, round: 3, agreed_time: result.agreed_time },
            round: 3, status: 'agreed'
        }
    ])

    // Update hangout as confirmed
    await supabase.from('hangouts').update({
        status: 'confirmed',
        confirmed_time: result.agreed_time
    }).eq('id', hangout_id)

    return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' }
    })
})
