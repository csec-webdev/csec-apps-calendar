import { NextResponse } from "next/server";
import { requireRole } from "@/lib/requireAdmin";
import { putJson, getJson } from "@/lib/s3";
import { TEAMS } from "@/lib/schemas";
import { invalidateCache } from "@/lib/cloudfront";
import { getChampionDataAccessToken } from "@/lib/championDataAuth";

type Params = Promise<{ teamKey: string }>;

// HockeyTech Season API response type
interface HockeyTechSeason {
  season_id: string;
  season_name: string;
  start_date: string;
  end_date: string;
  playoff: string;
  career: string;
}

interface HockeyTechSeasonsResponse {
  SiteKit: {
    Seasons: HockeyTechSeason[];
  };
}

// Get active seasons based on current date (Aug-June window)
function getActiveSeasonIds(seasons: HockeyTechSeason[]): string[] {
  const now = new Date();
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(now.getMonth() - 6);
  const fourMonthsAhead = new Date(now);
  fourMonthsAhead.setMonth(now.getMonth() + 4);
  
  const activeSeasons = seasons.filter(season => {
    // Skip preseason-only seasons (career=0)
    if (season.career === "0") return false;
    
    const startDate = new Date(season.start_date);
    const endDate = new Date(season.end_date);
    
    // Include if season overlaps with our window (6 months back, 4 months ahead)
    return endDate >= sixMonthsAgo && startDate <= fourMonthsAhead;
  });
  
  return activeSeasons.map(s => s.season_id);
}

export async function POST(req: Request, { params }: { params: Params }) {
  await requireRole();
  const { teamKey } = await params;

  const team = TEAMS.find((t) => t.key === teamKey);
  if (!team) {
    return NextResponse.json({ error: "Invalid team" }, { status: 400 });
  }

  try {
    let scheduleData: any = {};

    // Load team configuration
    const configKey = `public/data/${teamKey}/team-config.json`;
    console.log(`Loading team config from S3: ${configKey}`);
    const teamConfig = await getJson<any>(configKey);
    console.log(`Team config loaded:`, teamConfig ? 'exists' : 'null/undefined');

    // Fetch from HockeyTech leagues (WHL, AHL)
    if ((team.league === "whl" || team.league === "ahl") && teamConfig?.hockeyTech) {
      const { clientCode, apiKey, teamId } = teamConfig.hockeyTech;
      
      if (!clientCode || !apiKey || !teamId) {
        return NextResponse.json(
          { error: "Missing HockeyTech API configuration" },
          { status: 400 }
        );
      }

      // Step 1: Fetch seasons list
      const seasonsUrl = `https://lscluster.hockeytech.com/feed/index.php?feed=modulekit&view=seasons&client_code=${clientCode}&key=${apiKey}`;
      const seasonsResponse = await fetch(seasonsUrl);
      
      if (!seasonsResponse.ok) {
        throw new Error("Failed to fetch seasons list");
      }

      const seasonsData: HockeyTechSeasonsResponse = await seasonsResponse.json();
      const activeSeasonIds = getActiveSeasonIds(seasonsData.SiteKit.Seasons);
      
      console.log(`Found ${activeSeasonIds.length} active seasons:`, activeSeasonIds);

      // Step 2: Fetch schedule for each active season
      for (const seasonId of activeSeasonIds) {
        const scheduleUrl = `https://lscluster.hockeytech.com/feed/index.php?feed=statviewfeed&view=schedule&team=${teamId}&season=${seasonId}&month=-1&key=${apiKey}&client_code=${clientCode}`;
        const response = await fetch(scheduleUrl);
        
        if (!response.ok) {
          console.warn(`Failed to fetch season ${seasonId}, skipping`);
          continue;
        }

        // HockeyTech API returns JSONP (wrapped in parentheses)
        let text = await response.text();
        if (text.startsWith("(") && text.endsWith(")")) {
          text = text.substring(1, text.length - 1);
        }
        const seasonData = JSON.parse(text);
        const seasonGames = processHockeyTechSchedule(seasonData, team.league);
        
        // Merge games (don't replace, accumulate)
        Object.assign(scheduleData, seasonGames);
        console.log(`Fetched ${Object.keys(seasonGames).length} games from season ${seasonId}`);
      }
      
      // Update config with fetched seasons
      await putJson(configKey, {
        ...teamConfig,
        lastFetchedSeasons: activeSeasonIds,
        lastUpdated: new Date().toISOString(),
      });
    } else if (team.league === "nhl") {
      // NHL uses different API
      // Determine current NHL season (YYYYZZZZ format where YYYY is start year)
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      
      // NHL season runs Oct (9) -> June (5)
      // If we're in Jul-Sep, use upcoming season; otherwise use current season
      let seasonStartYear;
      if (currentMonth >= 6 && currentMonth <= 8) {
        // Jul-Sep: Use upcoming season
        seasonStartYear = currentYear;
      } else if (currentMonth >= 9) {
        // Oct-Dec: Season started this year
        seasonStartYear = currentYear;
      } else {
        // Jan-Jun: Season started last year
        seasonStartYear = currentYear - 1;
      }
      
      const seasonId = `${seasonStartYear}${seasonStartYear + 1}`;
      
      const response = await fetch(
        `https://api-web.nhle.com/v1/club-schedule-season/CGY/${seasonId}`,
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch NHL schedule");
      }

      const nhlData = await response.json();
      scheduleData = processNHLSchedule(nhlData);
      
      console.log(`Fetched NHL season ${seasonId}`);
    } else if (team.league === "nll") {
      // NLL uses Champion Data API via Auth0
      if (!teamConfig || !teamConfig.championData) {
        return NextResponse.json(
          { 
            error: "Missing team configuration file or championData section", 
            detail: `Please upload team-config.json to S3 at: public/data/${teamKey}/team-config.json`,
            hint: "The config file exists locally but needs to be uploaded to S3"
          },
          { status: 400 }
        );
      }

      const { 
        apiBaseUrl, 
        authDomain, 
        audience, 
        clientId, 
        clientSecret, 
        leagueId, 
        levelId, 
        seasonId,
        teamId,
        teamCode
      } = teamConfig.championData;
      
      if (!apiBaseUrl || !authDomain || !audience || !clientId || !clientSecret) {
        return NextResponse.json(
          { 
            error: "Missing Champion Data API configuration", 
            missing: "Need apiBaseUrl, authDomain, audience, clientId, clientSecret",
            found: { apiBaseUrl: !!apiBaseUrl, authDomain: !!authDomain, audience: !!audience, clientId: !!clientId, clientSecret: !!clientSecret }
          },
          { status: 400 }
        );
      }

      if (!leagueId || !levelId || !seasonId || !teamId) {
        return NextResponse.json(
          { 
            error: "Missing NLL configuration", 
            missing: "Need leagueId, levelId, seasonId, teamId",
            found: { leagueId: !!leagueId, levelId: !!levelId, seasonId: !!seasonId, teamId: !!teamId }
          },
          { status: 400 }
        );
      }

      // Step 1: Get OAuth2 access token from Auth0
      const accessToken = await getChampionDataAccessToken(
        authDomain,
        audience,
        clientId,
        clientSecret
      );

      const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      };

      // Step 2: Fetch schedule from Champion Data API
      const scheduleUrl = `${apiBaseUrl}/v1/leagues/${leagueId}/levels/${levelId}/seasons/${seasonId}/schedule`;
      console.log(`Fetching NLL schedule from: ${scheduleUrl}`);
      const scheduleResponse = await fetch(scheduleUrl, { headers });
      
      if (!scheduleResponse.ok) {
        const errorText = await scheduleResponse.text();
        throw new Error(`Failed to fetch NLL schedule: ${scheduleResponse.statusText} - ${errorText}`);
      }

      const nllData = await scheduleResponse.json();
      scheduleData = processNLLSchedule(nllData, teamId, teamCode);
      
      console.log(`Fetched NLL season ${seasonId} with ${Object.keys(scheduleData).length} games`);
    } else {
      return NextResponse.json(
        { error: `API not configured for ${team.name}` },
        { status: 400 },
      );
    }

    // Save to S3
    const key = `public/data/${teamKey}/schedule.json`;
    await putJson(key, scheduleData);

    // Invalidate CloudFront cache
    await invalidateCache([`/data/${teamKey}/schedule.json`]);

    const gamesCount = Object.keys(scheduleData).length;
    const seasonsInfo = teamConfig?.lastFetchedSeasons 
      ? ` from ${teamConfig.lastFetchedSeasons.length} season(s)` 
      : '';

    return NextResponse.json({
      success: true,
      gamesCount,
      message: `Fetched ${gamesCount} games${seasonsInfo}`,
      seasons: teamConfig?.lastFetchedSeasons || [],
    });
  } catch (error: any) {
    console.error("Error fetching schedule:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function processNHLSchedule(apiData: any): Record<string, any> {
  const games: Record<string, any> = {};

  if (!apiData || !apiData.games) {
    return games;
  }

  apiData.games.forEach((game: any) => {
    // Parse date (NHL API returns YYYY-MM-DD format)
    const [year, month, day] = game.gameDate.split("-");
    const gameDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const dateKey = formatDateKey(gameDate);

    const isHome = game.homeTeam.abbrev === "CGY";
    const opponent = isHome ? game.awayTeam : game.homeTeam;

    // Format game time (convert from UTC to MT)
    let gameTime = null;
    if (game.gameState === "FUT" || game.gameState === "PRE" || game.gameState === "LIVE") {
      const startTime = new Date(game.startTimeUTC);
      gameTime = formatTimeMT(startTime);
    }

    // Format result if game is finished
    let result = null;
    let flamesScore = null;
    let opponentScore = null;
    let periodType = null;

    if (game.gameState === "FINAL" || game.gameState === "OFF") {
      flamesScore = isHome ? game.homeTeam.score : game.awayTeam.score;
      opponentScore = isHome ? game.awayTeam.score : game.homeTeam.score;
      const won = flamesScore > opponentScore;

      periodType = game.periodDescriptor?.periodType || null;

      if (won) {
        result = `W ${flamesScore}-${opponentScore}`;
      } else {
        if (periodType === "OT") {
          result = `OTL ${flamesScore}-${opponentScore}`;
        } else if (periodType === "SO") {
          result = `SOL ${flamesScore}-${opponentScore}`;
        } else {
          result = `L ${flamesScore}-${opponentScore}`;
        }
      }
    }

    games[dateKey] = {
      id: game.id,
      date: gameDate.toISOString(),
      isHome,
      opponent: {
        abbrev: opponent.abbrev,
        name: opponent.commonName.default,
        logo: opponent.logo,
        darkLogo: opponent.darkLogo,
      },
      gameState: game.gameState,
      time: gameTime,
      result: result,
      flamesScore: flamesScore,
      opponentScore: opponentScore,
      periodType: periodType,
      tvNetworks: "",
      tvBroadcasts: game.tvBroadcasts || [],
      venue: game.venue.default,
      ticketsLink: isHome ? (game.ticketsLink || null) : null,
    };
  });

  return games;
}

// Format time in Mountain Time
function formatTimeMT(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    timeZone: "America/Denver",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }) + " MT";
}

function processHockeyTechSchedule(apiData: any, league: string): Record<string, any> {
  const games: Record<string, any> = {};

  if (!apiData || !apiData[0] || !apiData[0].sections || !apiData[0].sections[0]) {
    return games;
  }

  const gamesData = apiData[0].sections[0].data;
  const teamCity = "Calgary";

  gamesData.forEach((gameItem: any) => {
    const row = gameItem.row;
    const prop = gameItem.prop;

    const dateStr = row.date_with_day;
    const gameDate = parseWHLDate(dateStr);
    if (!gameDate) return;

    const dateKey = formatDateKey(gameDate);
    const isHome = row.home_team_city === teamCity;
    const opponentCity = isHome ? row.visiting_team_city : row.home_team_city;
    const opponentTeamId = isHome
      ? prop.visiting_team_city.teamLink
      : prop.home_team_city.teamLink;

    const homeScore = row.home_goal_count !== "-" ? parseInt(row.home_goal_count) : null;
    const visitingScore =
      row.visiting_goal_count !== "-" ? parseInt(row.visiting_goal_count) : null;

    const hitmenScore = isHome ? homeScore : visitingScore;
    const opponentScore = isHome ? visitingScore : homeScore;

    let gameState = "FUT";
    let result = null;
    let gameTime = null;
    let periodType = null;

    // Check if game is final (handles "Final", "Final OT", "Final SO")
    if (row.game_status && row.game_status.includes("Final")) {
      gameState = "FINAL";
      
      // Extract OT/SO information from game_status
      if (row.game_status.includes("OT")) {
        periodType = "OT";
      } else if (row.game_status.includes("SO") || row.game_status.includes("S/O")) {
        periodType = "SO";
      }
      
      if (hitmenScore !== null && opponentScore !== null) {
        const won = hitmenScore > opponentScore;
        if (won) {
          result = `W ${hitmenScore}-${opponentScore}`;
        } else {
          // Add OT/SO indicator for losses
          if (periodType === "OT") {
            result = `OTL ${hitmenScore}-${opponentScore}`;
          } else if (periodType === "SO") {
            result = `SOL ${hitmenScore}-${opponentScore}`;
          } else {
            result = `L ${hitmenScore}-${opponentScore}`;
          }
        }
      }
    } else {
      gameState = "FUT";
      gameTime = row.game_status;
    }

    // Use CloudFront URLs for opponent logos (whl or ahl based on league)
    const cloudfrontDomain = process.env.CLOUDFRONT_DOMAIN || 'd37ygqmmhd03wh.cloudfront.net';
    const leagueFolder = league.toLowerCase(); // 'whl' or 'ahl'
    const opponentLogo = `https://${cloudfrontDomain}/assets/opponents/${leagueFolder}/${opponentTeamId}.png`;

    games[dateKey] = {
      id: row.game_id,
      date: gameDate.toISOString(),
      isHome,
      opponent: {
        abbrev: opponentCity.substring(0, 3).toUpperCase(),
        name: opponentCity,
        logo: opponentLogo,
        darkLogo: opponentLogo,
      },
      gameState: gameState,
      time: gameTime,
      result: result,
      flamesScore: hitmenScore,
      opponentScore: opponentScore,
      periodType: periodType,
      tvNetworks: "",
      tvBroadcasts: [],
      venue: row.venue_name,
      ticketsLink: prop.tickets_url?.ticketsUrl || null,
    };
  });

  return games;
}

function parseWHLDate(dateStr: string): Date | null {
  try {
    const parts = dateStr.split(", ")[1].split(" ");
    const monthStr = parts[0];
    const day = parseInt(parts[1]);

    const monthMap: Record<string, number> = {
      Jan: 0,
      Feb: 1,
      Mar: 2,
      Apr: 3,
      May: 4,
      Jun: 5,
      Jul: 6,
      Aug: 7,
      Sep: 8,
      Oct: 9,
      Nov: 10,
      Dec: 11,
    };

    const month = monthMap[monthStr];
    if (month === undefined) return null;

    // Dynamically determine season year based on current date
    // Season runs Sep (month 8) to Apr (month 3) of the following year
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    // Determine which season we're in
    let seasonStartYear;
    if (currentMonth >= 8) {
      // Currently Sep-Dec, so season is current year to next year
      seasonStartYear = currentYear;
    } else if (currentMonth <= 3) {
      // Currently Jan-Apr, so season started last year
      seasonStartYear = currentYear - 1;
    } else {
      // Currently May-Aug (off-season), assume upcoming season
      seasonStartYear = currentYear;
    }
    
    // Assign year based on month
    // Sep-Dec uses seasonStartYear, Jan-Apr uses seasonStartYear + 1
    const year = month >= 8 ? seasonStartYear : seasonStartYear + 1;
    
    return new Date(year, month, day);
  } catch (error) {
    return null;
  }
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function processNLLSchedule(apiData: any, calgaryTeamId: string, calgaryTeamCode: string): Record<string, any> {
  const games: Record<string, any> = {};

  if (!apiData || !apiData.phases) {
    console.warn("No phases data in NLL API response");
    return games;
  }

  // Extract all matches from phases > weeks > matches structure
  const allMatches: any[] = [];
  apiData.phases.forEach((phase: any) => {
    if (phase.weeks && Array.isArray(phase.weeks)) {
      phase.weeks.forEach((week: any) => {
        if (week.matches && Array.isArray(week.matches)) {
          allMatches.push(...week.matches);
        }
      });
    }
  });

  console.log(`Found ${allMatches.length} total NLL matches`);

  // Filter for Calgary Roughnecks games and transform
  allMatches.forEach((match: any) => {
    try {
      if (!match) return;

      const homeSquad = match.squads?.home;
      const awaySquad = match.squads?.away;

      if (!homeSquad || !awaySquad) {
        return;
      }

      // Check if Calgary is in this game (home or away)
      const homeTeamId = homeSquad.id?.toString();
      const awayTeamId = awaySquad.id?.toString();
      const homeTeamCode = homeSquad.code;
      const awayTeamCode = awaySquad.code;

      const isCalgaryHome = homeTeamId === calgaryTeamId || homeTeamCode === calgaryTeamCode;
      const isCalgaryAway = awayTeamId === calgaryTeamId || awayTeamCode === calgaryTeamCode;

      if (!isCalgaryHome && !isCalgaryAway) {
        return; // Not a Calgary game, skip
      }

      // Determine home/away
      const isHome = isCalgaryHome;
      const opponentSquad = isHome ? awaySquad : homeSquad;

      // Parse game date
      let gameDate: Date;
      if (match.date?.utcMatchStart) {
        gameDate = new Date(match.date.utcMatchStart);
      } else if (match.date?.startDate && match.date?.startTime) {
        gameDate = new Date(`${match.date.startDate}T${match.date.startTime}`);
      } else {
        return; // No valid date
      }

      if (isNaN(gameDate.getTime())) {
        return; // Invalid date
      }

      const dateKey = formatDateKey(gameDate);

      // Determine game state and scores
      const statusCode = match.status?.code || '';
      const statusName = match.status?.name || '';
      const isCompleted = statusCode === 'COMP' || statusName === 'Complete' || statusName === 'Final';

      let gameState = "FUT";
      let result = null;
      let roughnecksScore = null;
      let opponentScore = null;
      let gameTime = null;
      let periodType = null;

      if (isCompleted) {
        gameState = "FINAL";
        const homeScore = homeSquad.score?.goals ?? homeSquad.score?.score ?? null;
        const awayScore = awaySquad.score?.goals ?? awaySquad.score?.score ?? null;

        roughnecksScore = isHome ? homeScore : awayScore;
        opponentScore = isHome ? awayScore : homeScore;

        if (roughnecksScore !== null && opponentScore !== null) {
          const won = roughnecksScore > opponentScore;
          // Check for overtime (NLL has quarters, so period > 4 means OT)
          if (match.status?.period > 4) {
            periodType = "OT";
          }
          
          result = won 
            ? `W ${roughnecksScore}-${opponentScore}` 
            : `L ${roughnecksScore}-${opponentScore}`;
        }
      } else {
        gameState = "FUT";
        gameTime = formatTimeMT(gameDate);
      }

      // Get opponent logo from CloudFront
      const cloudfrontDomain = process.env.CLOUDFRONT_DOMAIN || 'd37ygqmmhd03wh.cloudfront.net';
      const opponentCode = opponentSquad.code || opponentSquad.id;
      const opponentLogo = `https://${cloudfrontDomain}/assets/opponents/nll/${opponentCode}.png`;

      const gameId = match.id || null;
      const venue = match.venue?.name || (isHome ? "Scotiabank Saddledome" : "TBD");

      games[dateKey] = {
        id: gameId,
        date: gameDate.toISOString(),
        isHome,
        opponent: {
          abbrev: opponentSquad.code || opponentSquad.id?.toString() || "OPP",
          name: opponentSquad.displayName || `${opponentSquad.name || ''} ${opponentSquad.nickname || ''}`.trim() || "Unknown",
          logo: opponentLogo,
          darkLogo: opponentLogo,
        },
        gameState: gameState,
        time: gameTime,
        result: result,
        flamesScore: roughnecksScore, // Using 'flamesScore' for consistency with schema
        opponentScore: opponentScore,
        periodType: periodType,
        tvNetworks: "",
        tvBroadcasts: [],
        venue: venue,
        ticketsLink: isHome && gameId ? `https://www.ticketmaster.ca/calgary-roughnecks-tickets/artist/806208` : null,
      };
    } catch (error) {
      console.error(`Error processing match ${match?.id}:`, error);
    }
  });

  return games;
}

