import { z } from "zod";

// Team configuration
// Logo URLs should point to S3/CloudFront assets at: public/assets/teams/{teamKey}/logo.png
export const TEAMS = [
  {
    key: "flames",
    name: "Calgary Flames",
    league: "nhl",
    logoUrl: "/assets/teams/flames/logo.png",
  },
  {
    key: "hitmen",
    name: "Calgary Hitmen",
    league: "whl",
    logoUrl: "/assets/teams/hitmen/logo.png",
  },
  {
    key: "roughnecks",
    name: "Calgary Roughnecks",
    league: "nll",
    logoUrl: "/assets/teams/roughnecks/logo.png",
  },
  {
    key: "stampeders",
    name: "Calgary Stampeders",
    league: "cfl",
    logoUrl: "/assets/teams/stampeders/logo.png",
  },
  {
    key: "wranglers",
    name: "Calgary Wranglers",
    league: "ahl",
    logoUrl: "/assets/teams/wranglers/logo.png",
  },
] as const;

export type TeamKey = typeof TEAMS[number]["key"];

// Sponsor data schema
export const SponsorEntrySchema = z.object({
  label: z.string().min(1, "Label is required"),
  logo: z.string().url("Must be a valid URL"),
  text: z.string().nullable().optional(),
});

export const SponsorsDataSchema = z.object({
  comment: z.string().optional(),
  sponsors: z.record(z.string(), SponsorEntrySchema),
});

export type SponsorEntry = z.infer<typeof SponsorEntrySchema>;
export type SponsorsData = z.infer<typeof SponsorsDataSchema>;

// Custom ticket links schema
export const CustomTicketsDataSchema = z.object({
  comment: z.string().optional(),
  customLinks: z.record(z.string(), z.string().url("Must be a valid URL")),
});

export type CustomTicketsData = z.infer<typeof CustomTicketsDataSchema>;

// Schedule game schema (read-only for admin)
export const GameSchema = z.object({
  id: z.number(),
  date: z.string(),
  isHome: z.boolean(),
  opponent: z.object({
    abbrev: z.string(),
    name: z.string(),
    logo: z.string().optional(),
    darkLogo: z.string().optional(),
  }),
  gameState: z.string(),
  time: z.string().nullable(),
  result: z.string().nullable().optional(),
  flamesScore: z.number().optional(),
  opponentScore: z.number().optional(),
  periodType: z.string().optional(),
  tvNetworks: z.string().optional(),
  venue: z.string(),
  ticketsLink: z.string().nullable().optional(),
});

export const ScheduleDataSchema = z.record(z.string(), GameSchema);

export type Game = z.infer<typeof GameSchema>;
export type ScheduleData = z.infer<typeof ScheduleDataSchema>;

// Team configuration schema (for HockeyTech API settings)
export const TeamConfigSchema = z.object({
  // HockeyTech API settings (for WHL/AHL)
  hockeyTech: z.object({
    clientCode: z.string().optional(), // e.g., "whl" or "ahl"
    apiKey: z.string().optional(),
    teamId: z.string().optional(), // e.g., "202" for Hitmen
  }).optional(),
  
  // Champion Data API settings (for NLL) - OAuth2 via Auth0
  championData: z.object({
    apiBaseUrl: z.string().optional(), // e.g., "https://api.nll.championdata.io"
    authDomain: z.string().optional(), // Auth0 domain e.g., "https://championdata.au.auth0.com"
    audience: z.string().optional(), // API audience e.g., "https://api.nll.championdata.io/"
    clientId: z.string().optional(), // OAuth2 Client ID
    clientSecret: z.string().optional(), // OAuth2 Client Secret
    leagueId: z.string().optional(), // NLL league ID (e.g., "1")
    levelId: z.string().optional(), // Season level ID (e.g., "1")
    seasonId: z.string().optional(), // Season ID (e.g., "225" for 2025-26)
    teamId: z.string().optional(), // Calgary Roughnecks team ID (e.g., "524")
    teamCode: z.string().optional(), // Team code (e.g., "CGY")
  }).optional(),
  
  // Legacy season ID (deprecated, use auto-detection)
  seasonId: z.string().optional(),
  
  // Metadata
  lastFetchedSeasons: z.array(z.string()).optional(), // Track which seasons were last fetched
  lastUpdated: z.string().optional(),
});

export type TeamConfig = z.infer<typeof TeamConfigSchema>;

