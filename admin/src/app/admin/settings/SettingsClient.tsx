"use client";

import { useState, useEffect } from "react";
import { TEAMS } from "@/lib/schemas";
import type { TeamConfig, TeamKey } from "@/lib/schemas";
import { useToast } from "@/components/Toast";

export default function SettingsClient() {
  const [configs, setConfigs] = useState<Record<TeamKey, TeamConfig>>({} as any);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<TeamKey | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    loadAllConfigs();
  }, []);

  async function loadAllConfigs() {
    setLoading(true);
    try {
      const configPromises = TEAMS.map(async (team) => {
        const res = await fetch(`/api/teams/${team.key}/config`);
        const config = await res.json();
        return { key: team.key, config };
      });

      const results = await Promise.all(configPromises);
      const configsMap = {} as Record<TeamKey, TeamConfig>;
      results.forEach(({ key, config }) => {
        configsMap[key] = config;
      });

      setConfigs(configsMap);
    } catch (e: any) {
      showToast(`Error loading configs: ${e.message}`, "error");
    } finally {
      setLoading(false);
    }
  }

  async function saveConfig(teamKey: TeamKey) {
    setSaving(teamKey);
    try {
      const res = await fetch(`/api/teams/${teamKey}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configs[teamKey]),
      });
      if (!res.ok) throw new Error("Failed to save config");
      showToast(`${TEAMS.find(t => t.key === teamKey)?.name} config saved!`, "success");
    } catch (e: any) {
      showToast(`Error: ${e.message}`, "error");
    } finally {
      setSaving(null);
    }
  }

  function updateConfig(teamKey: TeamKey, field: string, value: string) {
    setConfigs((prev) => ({
      ...prev,
      [teamKey]: {
        ...prev[teamKey],
        hockeyTech: {
          ...prev[teamKey]?.hockeyTech,
          [field]: value,
        },
      },
    }));
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const hockeyTechTeams = TEAMS.filter(
    (t) => t.league === "whl" || t.league === "ahl"
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-2">
            Configure API credentials and team settings
          </p>
        </div>

        {/* HockeyTech API Configuration */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            HockeyTech API Configuration
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Configure API credentials for WHL and AHL teams
          </p>

          <div className="space-y-4">
            {hockeyTechTeams.map((team) => {
              const config = configs[team.key as TeamKey];
              const isSaving = saving === team.key;

              return (
                <div
                  key={team.key}
                  className="bg-white rounded-lg shadow border border-gray-200 p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={`/assets/teams/${team.key}/logo.png`}
                        alt={team.name}
                        className="w-10 h-10 object-contain"
                      />
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {team.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {team.league.toUpperCase()} League
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => saveConfig(team.key as TeamKey)}
                      disabled={isSaving}
                      className="px-4 py-2 bg-[#C8102E] text-white rounded-lg hover:bg-[#A00D25] disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                    >
                      {isSaving ? "Saving..." : "Save"}
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Client Code
                      </label>
                      <input
                        type="text"
                        placeholder={`e.g., ${team.league}`}
                        value={config?.hockeyTech?.clientCode || ""}
                        onChange={(e) =>
                          updateConfig(team.key as TeamKey, "clientCode", e.target.value)
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C8102E] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        API Key
                      </label>
                      <input
                        type="text"
                        placeholder="API Key"
                        value={config?.hockeyTech?.apiKey || ""}
                        onChange={(e) =>
                          updateConfig(team.key as TeamKey, "apiKey", e.target.value)
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C8102E] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Team ID
                      </label>
                      <input
                        type="text"
                        placeholder="Team ID"
                        value={config?.hockeyTech?.teamId || ""}
                        onChange={(e) =>
                          updateConfig(team.key as TeamKey, "teamId", e.target.value)
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C8102E] focus:border-transparent"
                      />
                    </div>
                  </div>

                  {config?.lastFetchedSeasons && config.lastFetchedSeasons.length > 0 && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600">
                        <strong>Last fetched seasons:</strong>{" "}
                        {config.lastFetchedSeasons.join(", ")}
                      </p>
                      {config.lastUpdated && (
                        <p className="text-xs text-gray-600 mt-1">
                          <strong>Last updated:</strong>{" "}
                          {new Date(config.lastUpdated).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

