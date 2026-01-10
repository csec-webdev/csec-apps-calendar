"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { RocketIcon, ChevronRightIcon } from "@/components/Icons";
import type {
  Game,
  SponsorsData,
  CustomTicketsData,
  SponsorEntry,
  TeamKey,
} from "@/lib/schemas";
import { TEAMS } from "@/lib/schemas";
import { useToast } from "@/components/Toast";

export function TeamsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const [teamKey, setTeamKey] = useState<TeamKey>(
    (searchParams.get("team") as TeamKey) || "flames",
  );
  const [schedule, setSchedule] = useState<Record<string, Game> | null>(null);
  const [sponsors, setSponsors] = useState<SponsorsData | null>(null);
  const [customTickets, setCustomTickets] = useState<CustomTicketsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [gameFilter, setGameFilter] = useState<"all" | "home" | "away">("all");
  const [showCSVModal, setShowCSVModal] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const [fetchCooldown, setFetchCooldown] = useState<number>(0);

  useEffect(() => {
    loadTeamData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamKey]);

  // Cooldown timer
  useEffect(() => {
    if (fetchCooldown > 0) {
      const timer = setTimeout(() => {
        setFetchCooldown(fetchCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [fetchCooldown]);

  async function loadTeamData() {
    setLoading(true);
    setError(null);
    try {
      const [schedRes, sponsorsRes, ticketsRes] = await Promise.all([
        fetch(`/api/teams/${teamKey}/schedule`),
        fetch(`/api/teams/${teamKey}/sponsors`),
        fetch(`/api/teams/${teamKey}/custom-tickets`),
      ]);

      if (!schedRes.ok) throw new Error("Failed to load schedule");

      setSchedule(await schedRes.json());
      setSponsors(await sponsorsRes.json());
      setCustomTickets(await ticketsRes.json());
      showToast("Team data loaded", "success");
    } catch (e: any) {
      setError(e.message);
      showToast(e.message, "error");
    } finally {
      setLoading(false);
    }
  }

  const games = useMemo(() => {
    if (!schedule) return [];

    return Object.entries(schedule)
      .map(([dateKey, game]) => ({ dateKey, ...game }))
      .filter((game) => {
        // Filter by home/away
        if (gameFilter === "home" && !game.isHome) return false;
        if (gameFilter === "away" && game.isHome) return false;

        // Filter by search term
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
          game.dateKey.includes(term) ||
          game.opponent.name.toLowerCase().includes(term) ||
          game.opponent.abbrev.toLowerCase().includes(term) ||
          game.venue.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [schedule, searchTerm, gameFilter]);

  async function saveSponsors() {
    if (!sponsors) return;
    setSaving(true);
    try {
      console.log("Saving sponsors:", JSON.stringify(sponsors, null, 2));
      const res = await fetch(`/api/teams/${teamKey}/sponsors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sponsors),
      });
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Save failed:", res.status, errorText);
        throw new Error(`Failed to save sponsors: ${res.status} ${errorText}`);
      }
      showToast("Sponsors saved successfully!", "success");
    } catch (e: any) {
      showToast(`Error: ${e.message}`, "error");
      console.error("Save sponsors error:", e);
    } finally {
      setSaving(false);
    }
  }

  async function saveCustomTickets() {
    if (!customTickets) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/teams/${teamKey}/custom-tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customTickets),
      });
      if (!res.ok) throw new Error("Failed to save custom tickets");
      showToast("Custom tickets saved successfully!", "success");
    } catch (e: any) {
      showToast(`Error: ${e.message}`, "error");
    } finally {
      setSaving(false);
    }
  }

  async function fetchScheduleFromAPI() {
    // Check cooldown
    if (fetchCooldown > 0) {
      showToast(`Please wait ${fetchCooldown} seconds before fetching again`, "error");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/teams/${teamKey}/fetch-schedule`, {
        method: "POST",
      });
      if (!res.ok) {
        const error = await res.json();
        const errorMsg = error.error || "Failed to fetch schedule";
        
        // Check for rate limit errors
        if (errorMsg.includes("rate limit") || errorMsg.includes("M2M token requests")) {
          setFetchCooldown(180); // 3 minute cooldown for rate limits
          throw new Error("API rate limit reached. Please wait 3 minutes before trying again.");
        }
        
        throw new Error(errorMsg);
      }
      const data = await res.json();
      const seasonInfo = data.seasons && data.seasons.length > 0 
        ? ` from ${data.seasons.length} season(s): ${data.seasons.join(", ")}`
        : "";
      showToast(`Fetched ${data.gamesCount} games${seasonInfo}!`, "success");
      
      // Set cooldown to prevent rapid clicking (30 seconds)
      setFetchCooldown(30);
      setLastFetchTime(Date.now());
      
      // Reload the team data to show the new schedule
      await loadTeamData();
    } catch (e: any) {
      showToast(`Error: ${e.message}`, "error");
    } finally {
      setSaving(false);
    }
  }

  async function uploadLogo(date: string, file: File) {
    setUploading(date);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`/api/teams/${teamKey}/upload-sponsor-logo`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");

      const { url } = await res.json();

      const updatedSponsors = {
        ...sponsors!,
        sponsors: {
          ...sponsors!.sponsors,
          [date]: {
            label: sponsors!.sponsors[date]?.label || "Presented By:",
            text: sponsors!.sponsors[date]?.text || null,
            logo: url,
          },
        },
      };

      setSponsors(updatedSponsors);

      // Auto-save sponsors after upload
      await fetch(`/api/teams/${teamKey}/sponsors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedSponsors),
      });

      showToast("Logo uploaded and saved successfully!", "success");
    } catch (e: any) {
      showToast(`Upload error: ${e.message}`, "error");
    } finally {
      setUploading(null);
    }
  }

  async function updateSponsor(date: string, sponsor: Partial<SponsorEntry> | null) {
    const updatedSponsors = {
      ...sponsors!,
      sponsors: { ...sponsors!.sponsors }
    };

    if (sponsor === null) {
      delete updatedSponsors.sponsors[date];
    } else {
      updatedSponsors.sponsors[date] = {
        label: sponsor.label ?? sponsors!.sponsors[date]?.label ?? "Presented By:",
        logo: sponsor.logo ?? sponsors!.sponsors[date]?.logo ?? "",
        text: sponsor.text ?? sponsors!.sponsors[date]?.text ?? null,
      };
    }

    setSponsors(updatedSponsors);

    // Auto-save sponsors after update
    try {
      await fetch(`/api/teams/${teamKey}/sponsors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedSponsors),
      });
      showToast(sponsor === null ? "Sponsor removed!" : "Sponsor saved!", "success");
    } catch (e: any) {
      showToast(`Error saving sponsor: ${e.message}`, "error");
    }
  }

  async function updateTicketLink(date: string, url: string | null) {
    const updatedTickets = {
      ...customTickets!,
      customLinks: { ...customTickets!.customLinks }
    };

    if (url === null || url.trim() === "") {
      delete updatedTickets.customLinks[date];
    } else {
      updatedTickets.customLinks[date] = url;
    }

    setCustomTickets(updatedTickets);

    // Auto-save ticket links after update
    try {
      await fetch(`/api/teams/${teamKey}/custom-tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedTickets),
      });
      showToast("Ticket link saved!", "success");
    } catch (e: any) {
      showToast(`Error saving ticket link: ${e.message}`, "error");
    }
  }

  async function handleCSVUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      // Skip header row if present
      const startIndex = lines[0].toLowerCase().includes('date') ? 1 : 0;
      
      const updatedTickets = {
        ...customTickets!,
        customLinks: { ...customTickets!.customLinks }
      };

      let successCount = 0;
      let errorCount = 0;

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Parse CSV line (handle both comma and semicolon)
        const parts = line.split(/[,;]/).map(p => p.trim().replace(/^["']|["']$/g, ''));
        
        if (parts.length >= 2) {
          const date = parts[0];
          const url = parts[1];

          // Validate date format (YYYY-MM-DD)
          if (/^\d{4}-\d{2}-\d{2}$/.test(date) && url) {
            updatedTickets.customLinks[date] = url;
            successCount++;
          } else {
            errorCount++;
          }
        }
      }

      if (successCount > 0) {
        setCustomTickets(updatedTickets);

        // Auto-save to S3
        await fetch(`/api/teams/${teamKey}/custom-tickets`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedTickets),
        });

        showToast(`Imported ${successCount} ticket links!`, "success");
      }

      if (errorCount > 0) {
        showToast(`Warning: ${errorCount} rows skipped (invalid format)`, "info");
      }
    } catch (e: any) {
      showToast(`CSV import error: ${e.message}`, "error");
    }

    // Reset file input
    event.target.value = '';
  }

  function handleTeamChange(newTeamKey: TeamKey) {
    setTeamKey(newTeamKey);
    router.push(`/admin/teams?team=${newTeamKey}`);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C8102E] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading team data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800 font-medium">Error: {error}</p>
        <button
          onClick={loadTeamData}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  const selectedTeam = TEAMS.find(t => t.key === teamKey);
  const calendarUrl = `https://${process.env.NEXT_PUBLIC_CLOUDFRONT_DOMAIN || 'd37ygqmmhd03wh.cloudfront.net'}/${teamKey}.html`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {selectedTeam && (
            <img 
              src={`/assets/teams/${teamKey}/logo.png`}
              alt={selectedTeam.name}
              className="w-16 h-16 object-contain"
            />
          )}
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Manage Team Data</h2>
            <p className="mt-1 text-sm text-gray-600">
              Update sponsors and ticket links for games
            </p>
          </div>
        </div>
        <a
          href={calendarUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          View Calendar
        </a>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Team selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Team
            </label>
            <select
              value={teamKey}
              onChange={(e) => handleTeamChange(e.target.value as TeamKey)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C8102E] focus:border-transparent"
            >
              {TEAMS.map((team) => (
                <option key={team.key} value={team.key}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Games
            </label>
            <input
              type="text"
              placeholder="Date, opponent, venue..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C8102E] focus:border-transparent"
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={loadTeamData}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium transition-colors flex items-center gap-2"
          >
            <RocketIcon className="w-5 h-5" />
            Publish Calendar
          </button>
          <button
            onClick={fetchScheduleFromAPI}
            disabled={saving || fetchCooldown > 0}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
          >
            {saving 
              ? "Fetching..." 
              : fetchCooldown > 0 
                ? `Wait ${fetchCooldown}s` 
                : "Fetch Schedule from API"}
          </button>
          <button
            onClick={() => setShowCSVModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import Ticket Links (CSV)
          </button>
        </div>
      </div>

      {/* Games list */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Games ({games.length})
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => setGameFilter("all")}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                gameFilter === "all"
                  ? "bg-[#C8102E] text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              All Games
            </button>
            <button
              onClick={() => setGameFilter("home")}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                gameFilter === "home"
                  ? "bg-[#C8102E] text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Home
            </button>
            <button
              onClick={() => setGameFilter("away")}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                gameFilter === "away"
                  ? "bg-[#C8102E] text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Away
            </button>
          </div>
        </div>

        {games.length === 0 ? (
          <div className="bg-white rounded-lg shadow border border-gray-200 p-8 text-center">
            <p className="text-gray-500">No games found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {games.map((game) => {
              const hasSponsor = sponsors?.sponsors[game.dateKey];
              const hasCustomTicket = customTickets?.customLinks[game.dateKey];
              const isEditing = editingDate === game.dateKey;

              return (
                <div
                  key={game.date}
                  className={`bg-white rounded-lg shadow border transition-all ${
                    isEditing ? "border-[#C8102E] ring-2 ring-red-100" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="p-4">
                    {/* Game info - clickable to expand */}
                    <div 
                      className="flex items-start justify-between cursor-pointer"
                      onClick={() => setEditingDate(isEditing ? null : game.dateKey)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-semibold text-gray-900">
                            {new Date(game.date).toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600 text-sm">
                              {game.isHome ? "vs" : "@"}
                            </span>
                            {game.opponent.logo && (
                              <img 
                                src={game.opponent.logo} 
                                alt={game.opponent.name}
                                className="h-8 w-8 object-contain"
                              />
                            )}
                            <span className="text-gray-600 text-sm">
                              {game.opponent.abbrev}
                            </span>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 mb-1">
                          {game.venue}
                        </div>
                        <div className="mb-3">
                          {game.result ? (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                              {game.result}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-600">{game.time || "TBD"}</span>
                          )}
                        </div>
                        <div className="flex gap-4 text-sm items-center">
                          <div className="flex items-center gap-2">
                            <strong>Sponsor:</strong>{" "}
                            {hasSponsor && sponsors ? (
                              <div className="flex items-center gap-2">
                                <span className="text-green-600 font-medium">✓</span>
                                {sponsors.sponsors[game.dateKey]?.logo && (
                                  <img 
                                    src={sponsors.sponsors[game.dateKey].logo} 
                                    alt="Sponsor Logo" 
                                    className="h-8 object-contain border border-gray-200 rounded px-2"
                                  />
                                )}
                                <span className="text-xs text-gray-500">
                                  {sponsors.sponsors[game.dateKey]?.label || "Presented By:"}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400">None</span>
                            )}
                          </div>
                          <span>
                            <strong>Ticket Link:</strong>{" "}
                            {hasCustomTicket ? (
                              <span className="text-green-600 font-medium">✓ Set</span>
                            ) : (
                              <span className="text-gray-400">None</span>
                            )}
                          </span>
                        </div>
                      </div>
                      <ChevronRightIcon 
                        className={`w-6 h-6 text-gray-400 transition-transform flex-shrink-0 ${
                          isEditing ? "rotate-90" : ""
                        }`}
                      />
                    </div>

                    {/* Editor */}
                    {isEditing && (
                      <div className="mt-4 pt-4 border-t border-gray-200 space-y-6">
                        {/* Sponsor section */}
                        <div>
                          <h4 className="text-base font-semibold text-gray-900 mb-3">
                            Sponsor
                          </h4>
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Label
                              </label>
                              <input
                                type="text"
                                value={sponsors?.sponsors[game.dateKey]?.label ?? "Presented By:"}
                                onChange={(e) =>
                                  updateSponsor(game.dateKey, { label: e.target.value })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C8102E] focus:border-transparent"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Logo URL
                              </label>
                              <input
                                type="text"
                                value={sponsors?.sponsors[game.dateKey]?.logo ?? ""}
                                onChange={(e) =>
                                  updateSponsor(game.dateKey, { logo: e.target.value })
                                }
                                placeholder="https://..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C8102E] focus:border-transparent"
                              />
                              <div className="mt-2 flex items-center gap-3">
                                <label
                                  htmlFor={`logo-${game.dateKey}`}
                                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg cursor-pointer font-medium transition-colors inline-block"
                                >
                                  {uploading === game.dateKey ? "Uploading..." : "Upload Logo"}
                                </label>
                                <input
                                  id={`logo-${game.dateKey}`}
                                  type="file"
                                  accept="image/*"
                                  disabled={uploading === game.dateKey}
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) uploadLogo(game.dateKey, file);
                                  }}
                                />
                              </div>
                              {sponsors?.sponsors[game.dateKey]?.logo && (
                                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                  <img
                                    src={sponsors.sponsors[game.dateKey].logo}
                                    alt="Sponsor"
                                    className="max-w-[200px] max-h-[80px] object-contain"
                                  />
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => updateSponsor(game.dateKey, null)}
                              className="px-4 py-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg font-medium transition-colors"
                            >
                              Remove Sponsor
                            </button>
                          </div>
                        </div>

                        {/* Ticket link section */}
                        <div>
                          <h4 className="text-base font-semibold text-gray-900 mb-3">
                            Custom Ticket Link
                          </h4>
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                URL or Deep Link
                              </label>
                              <input
                                type="text"
                                value={customTickets?.customLinks[game.dateKey] ?? ""}
                                onChange={(e) => updateTicketLink(game.dateKey, e.target.value)}
                                placeholder="https://... or app://..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C8102E] focus:border-transparent"
                              />
                            </div>
                            <button
                              onClick={() => updateTicketLink(game.dateKey, null)}
                              className="px-4 py-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg font-medium transition-colors"
                            >
                              Remove Custom Link
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CSV Upload Modal */}
      {showCSVModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">
                Import Ticket Links from CSV
              </h3>
              <button
                onClick={() => setShowCSVModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Instructions */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">How to use:</h4>
                <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
                  <li>Prepare a CSV file with two columns: date and ticketUrl</li>
                  <li>Date format must be YYYY-MM-DD (e.g., 2025-10-15)</li>
                  <li>The first row can be a header (optional)</li>
                  <li>Click "Choose File" below to select your CSV</li>
                  <li>Ticket links will be automatically imported and saved</li>
                </ol>
              </div>

              {/* CSV Format Example */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-gray-900 mb-3">CSV Format Example:</p>
                <code className="text-sm text-gray-700 block bg-white p-4 rounded border border-gray-300 font-mono">
                  date,ticketUrl<br/>
                  2025-10-15,https://tickets.example.com/game1<br/>
                  2025-10-20,https://tickets.example.com/game2<br/>
                  2025-11-05,https://tickets.example.com/game3
                </code>
              </div>

              {/* File Upload */}
              <div>
                <label className="block">
                  <span className="text-sm font-medium text-gray-700 mb-2 block">
                    Select CSV File:
                  </span>
                  <div className="flex items-center gap-3">
                    <label className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors cursor-pointer inline-flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Choose File
                      <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => {
                          handleCSVUpload(e);
                          setShowCSVModal(false);
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                </label>
              </div>

              {/* Warning */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <svg className="w-5 h-5 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Note:</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      New ticket links will be merged with existing ones. Duplicate dates will be overwritten.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowCSVModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
