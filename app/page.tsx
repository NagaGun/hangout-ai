import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const handleLogout = async () => {
    'use server'
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0a] text-white">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-6 border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current">
              <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
            </svg>
          </div>
          <span className="font-bold text-xl tracking-tight">Hangout AI</span>
        </div>

        <div className="flex items-center gap-6">
          <span className="text-sm text-zinc-400 font-medium">
            {user.email}
          </span>
          <form action={handleLogout}>
            <button className="px-4 py-2 text-sm font-semibold rounded-xl border border-white/10 hover:bg-white/5 transition-colors">
              Log out
            </button>
          </form>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-4xl space-y-12">
          <div className="space-y-4 text-center">
            <h2 className="text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50">
              Welcome back, Agent.
            </h2>
            <p className="text-zinc-400 text-lg max-w-xl mx-auto">
              You are signed in as {user.email}. Your personal AI coordinator is being initialized to manage your hangout requests.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: "Active Requests", value: "0", color: "from-purple-500" },
              { title: "Scheduled Hangouts", value: "0", color: "from-blue-500" },
              { title: "Agent Status", value: "Idle", color: "from-emerald-500" },
            ].map((stat, i) => (
              <div
                key={i}
                className="p-6 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm space-y-2 hover:border-white/20 transition-colors"
              >
                <p className="text-zinc-500 text-sm font-medium uppercase tracking-wider">{stat.title}</p>
                <p className={`text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${stat.color} to-white`}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          <div className="p-8 rounded-[40px] border border-white/10 bg-gradient-to-b from-white/5 to-transparent flex flex-col items-center text-center space-y-6">
            <div className="h-16 w-16 bg-white/10 rounded-full flex items-center justify-center border border-white/20">
              <svg className="w-8 h-8 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">New Hangout Request</h3>
              <p className="text-zinc-500">Coordinate a new meeting with your friends' agents.</p>
            </div>
            <button className="px-8 py-3 rounded-2xl bg-white text-black font-bold hover:scale-105 transition-transform active:scale-95">
              Start Coordination
            </button>
          </div>
        </div>
      </main>

      {/* Decorative Orbs */}
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/10 blur-[150px] -translate-x-1/2 translate-y-1/2 pointer-events-none" />
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 blur-[150px] translate-x-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  );
}
