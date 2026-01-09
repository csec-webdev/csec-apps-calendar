import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100">
      <main className="w-full max-w-4xl px-6 py-16">
        {/* Header with CSEC Logo */}
        <div className="text-center mb-12">
          <Image
            src="https://d37ygqmmhd03wh.cloudfront.net/assets/csec_primary.svg"
            alt="Calgary Sports and Entertainment Corporation"
            width={400}
            height={88}
            priority
            className="mx-auto mb-6"
          />
          <h1 className="text-4xl font-bold text-zinc-900 mb-3">
            CSEC Apps Calendar
          </h1>
          <p className="text-lg text-zinc-600 max-w-2xl mx-auto">
            Multi-team calendar management system for Calgary Flames, Hitmen, Wranglers, Roughnecks, and Stampeders
          </p>
        </div>

        {/* Quick Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <Link
            href="/admin"
            className="group bg-white rounded-xl shadow-sm hover:shadow-md transition-all p-6 border border-zinc-200 hover:border-zinc-300"
          >
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                🏒
              </div>
              <h2 className="text-2xl font-semibold text-zinc-900 group-hover:text-red-600 transition-colors">
                Admin Dashboard
              </h2>
            </div>
            <p className="text-zinc-600">
              Manage all team schedules, fetch latest games, and configure settings
            </p>
          </Link>

          <a
            href="https://d37ygqmmhd03wh.cloudfront.net/flames.html"
            target="_blank"
            rel="noopener noreferrer"
            className="group bg-white rounded-xl shadow-sm hover:shadow-md transition-all p-6 border border-zinc-200 hover:border-zinc-300"
          >
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                🔥
              </div>
              <h2 className="text-2xl font-semibold text-zinc-900 group-hover:text-red-600 transition-colors">
                View Calendars
              </h2>
            </div>
            <p className="text-zinc-600">
              See live public calendars for all CSEC teams
            </p>
          </a>
        </div>

        {/* Teams Grid */}
        <div className="bg-white rounded-xl shadow-sm p-8 border border-zinc-200 mb-8">
          <h3 className="text-xl font-semibold text-zinc-900 mb-6">Managed Teams</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-2 bg-red-600 rounded-full flex items-center justify-center text-white font-bold">
                NHL
              </div>
              <p className="text-sm font-medium text-zinc-900">Calgary Flames</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-2 bg-red-600 rounded-full flex items-center justify-center text-white font-bold">
                WHL
              </div>
              <p className="text-sm font-medium text-zinc-900">Calgary Hitmen</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-2 bg-red-600 rounded-full flex items-center justify-center text-white font-bold">
                AHL
              </div>
              <p className="text-sm font-medium text-zinc-900">Calgary Wranglers</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-2 bg-teal-600 rounded-full flex items-center justify-center text-white font-bold">
                NLL
              </div>
              <p className="text-sm font-medium text-zinc-900">Calgary Roughnecks</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-2 bg-red-700 rounded-full flex items-center justify-center text-white font-bold">
                CFL
              </div>
              <p className="text-sm font-medium text-zinc-900">Calgary Stampeders</p>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg p-4 border border-zinc-200 text-center">
            <div className="text-2xl mb-2">🔄</div>
            <p className="text-sm font-medium text-zinc-900">Automated Updates</p>
            <p className="text-xs text-zinc-600 mt-1">Hourly schedule refresh</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-zinc-200 text-center">
            <div className="text-2xl mb-2">🎯</div>
            <p className="text-sm font-medium text-zinc-900">Live Scores</p>
            <p className="text-xs text-zinc-600 mt-1">Real-time game results</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-zinc-200 text-center">
            <div className="text-2xl mb-2">📱</div>
            <p className="text-sm font-medium text-zinc-900">Mobile Ready</p>
            <p className="text-xs text-zinc-600 mt-1">Deep linking support</p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-zinc-500">
          <p>Built with ❤️ for Calgary Sports and Entertainment Corporation</p>
        </div>
      </main>
    </div>
  );
}
