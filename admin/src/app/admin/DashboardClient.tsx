"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { TEAMS } from "@/lib/schemas";
import { CalendarIcon, BuildingOfficeIcon, TicketIcon, ChevronRightIcon, ShieldCheckIcon } from "@/components/Icons";

type TeamStats = {
  teamKey: string;
  teamName: string;
  teamLogoUrl: string;
  gamesCount: number;
  sponsorsCount: number;
  customTicketsCount: number;
  loading: boolean;
};

export function DashboardClient() {
  const [stats, setStats] = useState<TeamStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    setLoading(true);

    const statsPromises = TEAMS.map(async (team) => {
      try {
        const [schedRes, sponsorsRes, ticketsRes] = await Promise.all([
          fetch(`/api/teams/${team.key}/schedule`),
          fetch(`/api/teams/${team.key}/sponsors`),
          fetch(`/api/teams/${team.key}/custom-tickets`),
        ]);

        const schedule = schedRes.ok ? await schedRes.json() : {};
        const sponsors = sponsorsRes.ok ? await sponsorsRes.json() : { sponsors: {} };
        const tickets = ticketsRes.ok
          ? await ticketsRes.json()
          : { customLinks: {} };

        return {
          teamKey: team.key,
          teamName: team.name,
          teamLogoUrl: team.logoUrl,
          gamesCount: Object.keys(schedule).length,
          sponsorsCount: Object.keys(sponsors.sponsors || {}).length,
          customTicketsCount: Object.keys(tickets.customLinks || {}).length,
          loading: false,
        };
      } catch (error) {
        return {
          teamKey: team.key,
          teamName: team.name,
          teamLogoUrl: team.logoUrl,
          gamesCount: 0,
          sponsorsCount: 0,
          customTicketsCount: 0,
          loading: false,
        };
      }
    });

    const results = await Promise.all(statsPromises);
    setStats(results);
    setLoading(false);
  }

  const totalGames = stats.reduce((sum, t) => sum + t.gamesCount, 0);
  const totalSponsors = stats.reduce((sum, t) => sum + t.sponsorsCount, 0);
  const totalTickets = stats.reduce((sum, t) => sum + t.customTicketsCount, 0);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="mt-1 text-sm text-gray-600">
          Overview of all CSEC team calendars and data management
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <CalendarIcon className="w-4 h-4" />
                <p className="text-sm font-medium">Total Games</p>
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {loading ? "..." : totalGames.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
              <CalendarIcon className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <BuildingOfficeIcon className="w-4 h-4" />
                <p className="text-sm font-medium">Sponsors Set</p>
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {loading ? "..." : totalSponsors.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
              <BuildingOfficeIcon className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-gray-600 mb-2">
                <TicketIcon className="w-4 h-4" />
                <p className="text-sm font-medium">Custom Tickets</p>
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {loading ? "..." : totalTickets.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
              <TicketIcon className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Team breakdown */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Teams</h3>
          <p className="text-sm text-gray-600 mt-1">Manage data for each CSEC team</p>
        </div>
        <div className="divide-y divide-gray-200">
          {loading ? (
            <div className="px-6 py-12 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#C8102E] mx-auto"></div>
              <p className="mt-4 text-sm text-gray-500">Loading team data...</p>
            </div>
          ) : (
            stats.map((team) => (
              <Link
                key={team.teamKey}
                href={`/admin/teams?team=${team.teamKey}`}
                className="block px-6 py-4 hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                      <img
                        src={team.teamLogoUrl}
                        alt={team.teamName}
                        className="w-10 h-10 object-contain"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                          target.parentElement!.innerHTML = `<span class="text-gray-400 text-xs font-medium">${team.teamName.charAt(0)}</span>`;
                        }}
                      />
                    </div>
                    <div>
                      <h4 className="text-base font-semibold text-gray-900 group-hover:text-[#C8102E] transition-colors">
                        {team.teamName}
                      </h4>
                      <div className="mt-1 flex gap-4 text-sm text-gray-600">
                        <span>{team.gamesCount} games</span>
                        <span className="text-gray-400">•</span>
                        <span>{team.sponsorsCount} sponsors</span>
                        <span className="text-gray-400">•</span>
                        <span>{team.customTicketsCount} custom tickets</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRightIcon className="w-5 h-5 text-gray-400 group-hover:text-[#C8102E] transition-colors" />
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/admin/teams"
              className="flex items-center gap-4 p-4 rounded-lg border-2 border-gray-200 hover:border-[#C8102E] hover:bg-red-50 transition-colors group"
            >
              <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-[#C8102E] transition-colors">
                <CalendarIcon className="w-6 h-6 text-gray-600 group-hover:text-white transition-colors" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 group-hover:text-[#C8102E] transition-colors">
                  Manage Teams
                </h4>
                <p className="text-sm text-gray-600">
                  Update sponsors and ticket links
                </p>
              </div>
            </Link>

            <Link
              href="/admin/access"
              className="flex items-center gap-4 p-4 rounded-lg border-2 border-gray-200 hover:border-[#C8102E] hover:bg-red-50 transition-colors group"
            >
              <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-[#C8102E] transition-colors">
                <ShieldCheckIcon className="w-6 h-6 text-gray-600 group-hover:text-white transition-colors" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 group-hover:text-[#C8102E] transition-colors">
                  Access Control
                </h4>
                <p className="text-sm text-gray-600">
                  Manage admin users and permissions
                </p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
