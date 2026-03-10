import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";

export default async function Home({ searchParams }: { searchParams: { connected?: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const isConnected = searchParams.connected === 'true';

  // Check if agent exists
  const { data: agent } = await supabase
    .from("agents")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!agent) {
    redirect("/agent/setup");
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0a] text-white selection:bg-purple-500/30">
      <Navbar
        agentName={agent.name}
        agentAvatar={agent.avatar_url}
        email={user.email!}
      />

      {isConnected && (
        <div className="max-w-5xl mx-auto w-full px-8 mt-8 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold flex items-center gap-3">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            You&apos;re now connected! Your agents can now coordinate.
          </div>
        </div>
      )}

      <main className="flex-1 flex flex-col items-center p-8 pt-16">
        <div className="w-full max-w-5xl space-y-16">
          {/* Hero Section with Agent Avatar */}
          <div className="flex flex-col md:flex-row items-center gap-10">
            <div className="relative group">
              <div className="absolute -inset-1.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
              <div className="relative h-40 w-40 rounded-full border-2 border-white/10 bg-white/5 overflow-hidden shadow-2xl">
                {agent.avatar_url ? (
                  <Image
                    src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${agent.avatar_url}`}
                    alt={agent.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-5xl font-bold text-zinc-700">
                    {agent.name[0]}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4 text-center md:text-left">
              <h2 className="text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50">
                Nexus Dashboard
              </h2>
              <p className="text-zinc-400 text-xl max-w-xl">
                Logged in as <span className="text-white font-medium">{user.email}</span>. Your agent, <span className="text-purple-400 font-bold">{agent.name}</span>, is ready to coordinate your schedule.
              </p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: "Active Requests", value: "0", color: "from-purple-500" },
              { title: "Scheduled Hangouts", value: "0", color: "from-blue-500" },
              { title: "Coordination Syncs", value: "0", color: "from-emerald-500" },
            ].map((stat, i) => (
              <div
                key={i}
                className="p-8 rounded-[2rem] border border-white/10 bg-white/5 backdrop-blur-sm space-y-3 hover:border-white/20 transition-all hover:translate-y-[-4px]"
              >
                <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest">{stat.title}</p>
                <p className={`text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r ${stat.color} to-white`}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          {/* Quick Action */}
          <div className="group relative p-[1px] rounded-[3rem] bg-gradient-to-r from-white/10 to-transparent overflow-hidden transition-all hover:bg-white/20">
            <div className="relative p-10 rounded-[3rem] bg-black/80 flex flex-col items-center text-center space-y-8">
              <div className="h-20 w-20 bg-white/5 rounded-3xl flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform duration-500">
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-black">New Hangout Request</h3>
                <p className="text-zinc-500 text-lg max-w-md">Specify a group of friends and let <span className="text-white italic">{agent.name}</span> negotiate the best time via Google Calendar.</p>
              </div>
              <Link href="/hangout/new" className="px-10 py-4 rounded-2xl bg-white text-black font-black text-lg hover:scale-105 transition-all active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.1)] inline-block">
                Start Coordination
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Decorative Elements */}
      <div className="fixed bottom-0 left-0 w-[600px] h-[600px] bg-purple-600/5 blur-[180px] -translate-x-1/3 translate-y-1/3 pointer-events-none" />
      <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-blue-600/5 blur-[180px] translate-x-1/3 -translate-y-1/3 pointer-events-none" />

      {/* Ambient Noise */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.015] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay" />
    </div>
  );
}
