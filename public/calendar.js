// Determine if running locally
function isLocalEnvironment() {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const urlParams = new URLSearchParams(window.location.search);
    // Allow forcing S3 connection with ?s3=true query parameter
    if (urlParams.get('s3') === 'true') {
        return false;
    }
    // Check for localhost, 127.0.0.1, or file:// protocol
    return hostname === 'localhost' || 
           hostname === '127.0.0.1' || 
           hostname === '' || 
           protocol === 'file:' ||
           hostname.startsWith('192.168.') ||
           hostname.startsWith('10.') ||
           hostname.endsWith('.local');
}

// Team/league selection (set by team HTML pages)
const TEAM_KEY = String(window.__TEAM_KEY__ || new URLSearchParams(window.location.search).get('team') || 'flames').toLowerCase();
const LEAGUE_KEY = String(window.__LEAGUE_KEY__ || 'nhl').toLowerCase();

function getPublicBaseUrl() {
    // For file:// origin can be "null"
    if (isLocalEnvironment() || window.location.origin === 'null') return '';
    return window.location.origin;
}

function joinUrl(base, path) {
    if (!base) return path.replace(/^\//, '');
    return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

// Calculate current season year (used by CONFIG)
function getCurrentSeasonYear() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    // NHL/WHL season runs Sep/Oct -> Jun
    let seasonStartYear;
    if (currentMonth >= 6 && currentMonth <= 8) {
        // Jul-Sep: Upcoming season
        seasonStartYear = currentYear;
    } else if (currentMonth >= 9) {
        // Oct-Dec: Current season started this year
        seasonStartYear = currentYear;
    } else {
        // Jan-Jun: Current season started last year
        seasonStartYear = currentYear - 1;
    }
    
    return `${seasonStartYear}${seasonStartYear + 1}`;
}

// Calendar configuration
const SEASON_YEAR = getCurrentSeasonYear();
const CONFIG = {
    startMonth: 8, // September (0-indexed)
    endMonth: 3,   // April (0-indexed, wraps to next year)
    seasonYear: SEASON_YEAR,
    // In v2, public data is served from the same origin (CloudFront) as the page.
    dataUrl: joinUrl(getPublicBaseUrl(), `data/${TEAM_KEY}/schedule.json`),
    // League-specific API fallback (WHL now uses auto-detection in admin)
    apiUrl: (() => {
        if (LEAGUE_KEY === 'nhl' && TEAM_KEY === 'flames') {
            return `https://api-web.nhle.com/v1/club-schedule-season/CGY/${SEASON_YEAR}`;
        }
        return null;
    })(),
    customTicketsUrl: joinUrl(getPublicBaseUrl(), `data/${TEAM_KEY}/custom-tickets.json`),
    sponsorsUrl: joinUrl(getPublicBaseUrl(), `data/${TEAM_KEY}/sponsors.json`)
};

// Calendar state
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let scheduleData = null;
let availableMonths = [];
let customTicketLinks = {}; // Store custom ticket links
let sponsorData = {}; // Store sponsor data

// Swipe gesture state
let touchStartX = null;
let touchStartY = null;
const SWIPE_THRESHOLD = 50; // Minimum distance in pixels for a swipe
const SWIPE_MAX_VERTICAL = 100; // Maximum vertical movement to still count as horizontal swipe

// Generate game detail URL (preview/summary)
function getGameDetailUrl(gameId) {
    const urlConfigs = {
        flames: `fr-calgary-flames://open_alliance_webview?id=${gameId}&persona_lookup_key=calgary_flames_nhl&component_lookup_key=nhl_game_detail`,
        hitmen: `fr-calgary-hitmen://open_alliance_webview?id=${gameId}&persona_lookup_key=calgary_hitmen_app&component_lookup_key=chl_game_detail`,
        roughnecks: `calgary-roughnecks-fr://open_alliance_webview?id=${gameId}&persona_lookup_key=calgary_roughnecks_nll&component_lookup_key=nll_game_detail`,
        stampeders: `fr-calgary-stampeders://open_alliance_webview?id=${gameId}&persona_lookup_key=calgary_stampeders_cfl&component_lookup_key=cfl_game_detail`,
        wranglers: `fr-calgary-flames://open_alliance_webview?id=${gameId}&persona_lookup_key=wranglers_ahl&component_lookup_key=ahl_game_detail`,
    };
    return urlConfigs[TEAM_KEY] || urlConfigs.flames;
}

// Get current team info
function getTeamInfo() {
    // For localhost testing, use relative paths; for production use CloudFront
    const baseUrl = window.location.hostname === 'localhost' ? '' : getPublicBaseUrl();
    
    const teamConfigs = {
        flames: { 
            name: 'Flames', 
            fullName: 'Calgary Flames', 
            abbrev: 'CGY',
            color: '#C8102E',
            logoHome: 'https://assets.nhle.com/logos/nhl/svg/CGY_alt.svg', 
            logoAway: 'https://assets.nhle.com/logos/nhl/svg/CGY_light.svg' 
        },
        hitmen: { 
            name: 'Hitmen', 
            fullName: 'Calgary Hitmen', 
            abbrev: 'CGY',
            color: '#8B634B',
            logoHome: baseUrl ? joinUrl(baseUrl, 'assets/teams/hitmen/logo.png') : 'assets/teams/hitmen/logo.png', 
            logoAway: baseUrl ? joinUrl(baseUrl, 'assets/teams/hitmen/logo.png') : 'assets/teams/hitmen/logo.png'
        },
        roughnecks: { 
            name: 'Roughnecks', 
            fullName: 'Calgary Roughnecks', 
            abbrev: 'CGY',
            color: '#000000',
            logoHome: baseUrl ? joinUrl(baseUrl, 'assets/teams/roughnecks/logo.png') : 'assets/teams/roughnecks/logo.png', 
            logoAway: baseUrl ? joinUrl(baseUrl, 'assets/teams/roughnecks/logo.png') : 'assets/teams/roughnecks/logo.png'
        },
        stampeders: { 
            name: 'Stampeders', 
            fullName: 'Calgary Stampeders', 
            abbrev: 'CGY',
            color: '#C8102E',
            logoHome: baseUrl ? joinUrl(baseUrl, 'assets/teams/stampeders/logo.png') : 'assets/teams/stampeders/logo.png', 
            logoAway: baseUrl ? joinUrl(baseUrl, 'assets/teams/stampeders/logo.png') : 'assets/teams/stampeders/logo.png'
        },
        wranglers: { 
            name: 'Wranglers', 
            fullName: 'Calgary Wranglers', 
            abbrev: 'CGY',
            color: '#C8102E',
            logoHome: baseUrl ? joinUrl(baseUrl, 'assets/teams/wranglers/logo.png') : 'assets/teams/wranglers/logo.png', 
            logoAway: baseUrl ? joinUrl(baseUrl, 'assets/teams/wranglers/logo.png') : 'assets/teams/wranglers/logo.png'
        },
    };
    return teamConfigs[TEAM_KEY] || teamConfigs.flames;
}

// Initialize calendar
document.addEventListener('DOMContentLoaded', async () => {
    // Apply team-specific color
    const teamInfo = getTeamInfo();
    document.documentElement.style.setProperty('--team-color', teamInfo.color);
    
    // Update page title dynamically
    document.title = `${teamInfo.fullName} Schedule`;
    
    // Setup modal event listeners
    const modal = document.getElementById('gameModal');
    const closeBtn = document.getElementById('closeModal');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closeGameModal);
    }
    
    // Close modal when clicking outside
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeGameModal();
            }
        });
    }
    
    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal && modal.classList.contains('active')) {
            closeGameModal();
        }
    });
    
    // Update timezone info
    updateTimezoneInfo();
    
    // Load schedule data
    await loadScheduleData();
    
    // Always start with the current month - don't jump to other months
    // The calendar will show empty if there are no games, which is expected behavior
    
    // Setup event listeners
    document.getElementById('prevMonth').addEventListener('click', () => {
        if (!document.getElementById('prevMonth').classList.contains('disabled')) {
            navigateMonth(-1);
        }
    });
    document.getElementById('nextMonth').addEventListener('click', () => {
        if (!document.getElementById('nextMonth').classList.contains('disabled')) {
            navigateMonth(1);
        }
    });
    
    // Add keyboard support for accessibility
    document.getElementById('prevMonth').addEventListener('keydown', (e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !document.getElementById('prevMonth').classList.contains('disabled')) {
            e.preventDefault();
            navigateMonth(-1);
        }
    });
    document.getElementById('nextMonth').addEventListener('keydown', (e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !document.getElementById('nextMonth').classList.contains('disabled')) {
            e.preventDefault();
            navigateMonth(1);
        }
    });
    
    // Setup swipe gestures for month navigation
    setupSwipeGestures();
    
    // Render initial calendar
    renderCalendar();
});

// Load custom ticket links from JSON file
async function loadCustomTicketLinks() {
    try {
        const cacheBuster = `?t=${Date.now()}`;
        const response = await fetch(CONFIG.customTicketsUrl + cacheBuster);
        
        if (!response.ok) {
            console.log('Custom tickets file not found, using API links only');
            customTicketLinks = {};
            return;
        }
        
        const data = await response.json();
        customTicketLinks = data.customLinks || {};
        console.log('Loaded custom ticket links:', Object.keys(customTicketLinks).length);
    } catch (error) {
        console.error('Error loading custom ticket links:', error);
        customTicketLinks = {};
    }
}

// Load sponsor data from JSON file
async function loadSponsorData() {
    try {
        const cacheBuster = `?t=${Date.now()}`;
        const response = await fetch(CONFIG.sponsorsUrl + cacheBuster);
        
        if (!response.ok) {
            console.log('Sponsors file not found');
            sponsorData = {};
            return;
        }
        
        const data = await response.json();
        sponsorData = data.sponsors || {};
        console.log('Loaded sponsor data:', Object.keys(sponsorData).length);
    } catch (error) {
        console.error('Error loading sponsor data:', error);
        sponsorData = {};
    }
}

// Apply custom ticket links to schedule data
function applyCustomTicketLinks() {
    if (!scheduleData || !customTicketLinks || Object.keys(customTicketLinks).length === 0) {
        return;
    }
    
    Object.keys(scheduleData).forEach(dateKey => {
        const game = scheduleData[dateKey];
        
        // Check for custom link by game ID first
        if (game.id && customTicketLinks[game.id]) {
            game.ticketsLink = customTicketLinks[game.id];
            return;
        }
        
        // Check for custom link by date (YYYY-MM-DD)
        const dateStr = formatDateKey(game.date);
        if (customTicketLinks[dateStr]) {
            game.ticketsLink = customTicketLinks[dateStr];
            return;
        }
    });
}

// Load schedule data from API or cached JSON
async function loadScheduleData() {
    try {
        // Try to load from local data file first (for development)
        // In production, this will be an S3 URL
        // Add cache-busting to prevent stale data
        const cacheBuster = `?t=${Date.now()}`;
        const response = await fetch(CONFIG.dataUrl + cacheBuster);
        
        if (!response.ok) {
            // Fallback to direct API call if data file doesn't exist
            console.log('Data file not found, fetching from API...');
            await fetchAndProcessSchedule();
            return;
        }
        
        const rawData = await response.json();
        
        // Check if data is empty, if so fallback to API
        if (!rawData || Object.keys(rawData).length === 0) {
            console.log('Data file is empty, fetching from API...');
            await fetchAndProcessSchedule();
            return;
        }
        
        // Convert ISO date strings back to Date objects (fix timezone issue)
        scheduleData = {};
        Object.keys(rawData).forEach(key => {
            // Parse date as local date to avoid timezone shift
            const dateStr = rawData[key].date.split('T')[0]; // Get just YYYY-MM-DD part
            const [year, month, day] = dateStr.split('-');
            const localDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            
            scheduleData[key] = {
                ...rawData[key],
                date: localDate
            };
            // Ensure ticketsLink is preserved
            if (rawData[key].ticketsLink) {
                scheduleData[key].ticketsLink = rawData[key].ticketsLink;
            }
            // Ensure tvBroadcasts is preserved
            if (rawData[key].tvBroadcasts) {
                scheduleData[key].tvBroadcasts = rawData[key].tvBroadcasts;
            }
            // Ensure scores are preserved
            if (rawData[key].flamesScore !== undefined) {
                scheduleData[key].flamesScore = rawData[key].flamesScore;
            }
            // Ensure periodType is preserved
            if (rawData[key].periodType !== undefined) {
                scheduleData[key].periodType = rawData[key].periodType;
            }
        });
        determineAvailableMonths();
        console.log(`Loaded ${Object.keys(scheduleData).length} games, available months:`, availableMonths.length);
        
        // Apply custom ticket links after loading schedule data
        await loadCustomTicketLinks();
        applyCustomTicketLinks();
        
        // Load sponsor data
        await loadSponsorData();
    } catch (error) {
        console.error('Error loading schedule:', error);
        // Try direct API call as fallback
        await fetchAndProcessSchedule();
    }
}

// Fetch schedule directly from API and process it
async function fetchAndProcessSchedule() {
    try {
        if (!CONFIG.apiUrl) {
            document.getElementById('calendarGrid').innerHTML =
                '<div class="error">Schedule source not configured for this team yet.</div>';
            return;
        }
        const response = await fetch(CONFIG.apiUrl);
        if (!response.ok) {
            throw new Error('Failed to fetch schedule');
        }
        
        const data = await response.json();
        
        // Process data based on league
        if (LEAGUE_KEY === 'nhl') {
            scheduleData = processNHLScheduleData(data);
        } else if (LEAGUE_KEY === 'whl') {
            scheduleData = processWHLScheduleData(data);
        } else {
            scheduleData = processScheduleData(data); // fallback
        }
        
        determineAvailableMonths();
        
        // Apply custom ticket links after fetching from API
        await loadCustomTicketLinks();
        applyCustomTicketLinks();
        
        // Load sponsor data
        await loadSponsorData();
    } catch (error) {
        console.error('Error fetching schedule:', error);
        document.getElementById('calendarGrid').innerHTML = 
            '<div class="error">Failed to load schedule. Please try again later.</div>';
    }
}

// Process raw NHL API data into calendar-friendly format
function processNHLScheduleData(apiData) {
    const games = {};
    
    apiData.games.forEach(game => {
        // Parse date as local date to avoid timezone shift
        const [year, month, day] = game.gameDate.split('-');
        const gameDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        const dateKey = formatDateKey(gameDate);
        
        // Determine if home or away
        const isHome = game.homeTeam.abbrev === 'CGY';
        const opponent = isHome ? game.awayTeam : game.homeTeam;
        
        // Format game time (convert to MT)
        let gameTime = null;
        if (game.gameState === 'FUT' || game.gameState === 'PRE' || game.gameState === 'LIVE') {
            const startTime = new Date(game.startTimeUTC);
            gameTime = formatTimeMT(startTime);
        }
        
        // Format result if game is finished
        let result = null;
        let flamesScore = null;
        let opponentScore = null;
        let periodType = null;
        if (game.gameState === 'FINAL' || game.gameState === 'OFF') {
            flamesScore = isHome ? game.homeTeam.score : game.awayTeam.score;
            opponentScore = isHome ? game.awayTeam.score : game.homeTeam.score;
            const won = flamesScore > opponentScore;
            
            // Store period type for determining FINAL OT/SO (for all final games)
            periodType = game.periodDescriptor?.periodType || null;
            
            if (won) {
                result = `W ${flamesScore}-${opponentScore}`;
            } else {
                // Check for overtime or shootout
                if (periodType === 'OT') {
                    result = `OTL ${flamesScore}-${opponentScore}`;
                } else if (periodType === 'SO') {
                    result = `SOL ${flamesScore}-${opponentScore}`;
                } else {
                    result = `L ${flamesScore}-${opponentScore}`;
                }
            }
        }
        
        // Get TV broadcasts - store full broadcast objects with IDs for logos
        const tvBroadcasts = game.tvBroadcasts || [];
        // Also keep tvNetworks as comma-separated string for backward compatibility
        const tvNetworks = tvBroadcasts
            .map(broadcast => broadcast.network)
            .filter((v, i, a) => a.indexOf(v) === i) // Remove duplicates
            .join(', ') || '';
        
        games[dateKey] = {
            id: game.id,
            date: gameDate,
            isHome,
            opponent: {
                abbrev: opponent.abbrev,
                name: opponent.commonName.default,
                logo: opponent.logo,
                darkLogo: opponent.darkLogo
            },
            gameState: game.gameState,
            time: gameTime,
            result: result,
            flamesScore: flamesScore,
            opponentScore: opponentScore,
            periodType: periodType,
            tvNetworks: tvNetworks,
            tvBroadcasts: tvBroadcasts, // Store full broadcast array with IDs
            venue: game.venue.default,
            ticketsLink: isHome ? (game.ticketsLink || null) : null
        };
    });
    
    return games;
}

// Process raw WHL API data into calendar-friendly format
function processWHLScheduleData(apiData) {
    const games = {};
    
    console.log('Processing WHL data:', apiData);
    
    // WHL API returns array with sections
    if (!apiData || !apiData[0] || !apiData[0].sections || !apiData[0].sections[0]) {
        console.error('WHL data structure invalid:', apiData);
        return games;
    }
    
    const gamesData = apiData[0].sections[0].data;
    console.log(`Found ${gamesData.length} WHL games to process`);
    const teamCity = 'Calgary'; // Calgary Hitmen
    
    gamesData.forEach((gameItem, index) => {
        const row = gameItem.row;
        const prop = gameItem.prop;
        
        // Parse date (format: "Fri, Sep 19")
        const dateStr = row.date_with_day;
        const gameDate = parseWHLDate(dateStr);
        if (!gameDate) {
            console.warn(`Failed to parse date for game ${index}:`, dateStr);
            return;
        }
        
        const dateKey = formatDateKey(gameDate);
        
        // Determine if home or away
        const isHome = row.home_team_city === teamCity;
        const opponentCity = isHome ? row.visiting_team_city : row.home_team_city;
        const opponentTeamId = isHome ? prop.visiting_team_city.teamLink : prop.home_team_city.teamLink;
        
        // Get scores
        const homeScore = row.home_goal_count !== '-' ? parseInt(row.home_goal_count) : null;
        const visitingScore = row.visiting_goal_count !== '-' ? parseInt(row.visiting_goal_count) : null;
        
        let hitmenScore = isHome ? homeScore : visitingScore;
        let opponentScore = isHome ? visitingScore : homeScore;
        
        // Determine game state and result
        let gameState = 'FUT';
        let result = null;
        let gameTime = null;
        let periodType = null;
        
        // Check if game is final (handles "Final", "Final OT", "Final SO")
        if (row.game_status && row.game_status.includes('Final')) {
            gameState = 'FINAL';
            
            // Extract OT/SO information from game_status
            if (row.game_status.includes('OT')) {
                periodType = 'OT';
            } else if (row.game_status.includes('SO') || row.game_status.includes('S/O')) {
                periodType = 'SO';
            }
            
            if (hitmenScore !== null && opponentScore !== null) {
                const won = hitmenScore > opponentScore;
                if (won) {
                    result = `W ${hitmenScore}-${opponentScore}`;
                } else {
                    // Add OT/SO indicator for losses
                    if (periodType === 'OT') {
                        result = `OTL ${hitmenScore}-${opponentScore}`;
                    } else if (periodType === 'SO') {
                        result = `SOL ${hitmenScore}-${opponentScore}`;
                    } else {
                        result = `L ${hitmenScore}-${opponentScore}`;
                    }
                }
            }
        } else {
            gameState = 'FUT';
            gameTime = row.game_status; // e.g., "7:00 pm MST"
        }
        
        // Build opponent logo URL - use our own S3 logos
        const baseUrl = getPublicBaseUrl();
        const leagueFolder = LEAGUE_KEY.toLowerCase(); // 'whl' or 'ahl'
        const opponentLogo = baseUrl 
            ? joinUrl(baseUrl, `assets/opponents/${leagueFolder}/${opponentTeamId}.png`)
            : `assets/opponents/${leagueFolder}/${opponentTeamId}.png`;
        
        games[dateKey] = {
            id: row.game_id,
            date: gameDate,
            isHome,
            opponent: {
                abbrev: opponentCity.substring(0, 3).toUpperCase(), // Rough abbreviation
                name: opponentCity,
                logo: opponentLogo,
                darkLogo: opponentLogo
            },
            gameState: gameState,
            time: gameTime,
            result: result,
            flamesScore: hitmenScore,
            opponentScore: opponentScore,
            periodType: periodType,
            tvNetworks: '',
            tvBroadcasts: [],
            venue: row.venue_name,
            ticketsLink: prop.tickets_url?.ticketsUrl || null
        };
        
        console.log(`Added WHL game ${dateKey}:`, games[dateKey]);
    });
    
    console.log(`Total WHL games processed: ${Object.keys(games).length}`);
    return games;
}

// Parse WHL date format (e.g., "Fri, Sep 19" or "Sat, Oct 4")
function parseWHLDate(dateStr) {
    try {
        // Extract month and day
        const parts = dateStr.split(', ')[1].split(' ');
        const monthStr = parts[0];
        const day = parseInt(parts[1]);
        
        const monthMap = {
            'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
            'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
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
        console.error('Error parsing WHL date:', dateStr, error);
        return null;
    }
}

// Legacy function for backward compatibility
function processScheduleData(apiData) {
    // Default to NHL format if called directly
    return processNHLScheduleData(apiData);
}

// Determine which months have games
function determineAvailableMonths() {
    if (!scheduleData) return;
    
    const months = new Set();
    Object.values(scheduleData).forEach(game => {
        const month = game.date.getMonth();
        const year = game.date.getFullYear();
        months.add(`${year}-${month}`);
    });
    
    availableMonths = Array.from(months)
        .map(m => {
            const [year, month] = m.split('-').map(Number);
            return { year, month };
        })
        .sort((a, b) => {
            if (a.year !== b.year) return a.year - b.year;
            return a.month - b.month;
        });
}

// Determine if current date is in Daylight Saving Time (MDT) or Standard Time (MST)
function isDaylightSavingTime(date) {
    // Check if Mountain Time is currently in DST
    // DST typically runs from second Sunday in March to first Sunday in November
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    
    // Create dates in Mountain Time to check DST
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Denver',
        timeZoneName: 'short'
    });
    
    const parts = formatter.formatToParts(date);
    const tzName = parts.find(part => part.type === 'timeZoneName')?.value || '';
    
    // If timezone name contains 'MDT' or 'MST', use that
    // Otherwise, check by month (DST is typically March-November)
    if (tzName.includes('MDT')) return true;
    if (tzName.includes('MST')) return false;
    
    // Fallback: DST is typically from March to November
    // More precisely: second Sunday in March to first Sunday in November
    if (month < 2 || month > 10) return false; // Jan, Feb, Dec are MST
    if (month > 2 && month < 10) return true;  // Apr-Oct are MDT
    
    // March: check if after second Sunday
    if (month === 2) {
        const secondSunday = getNthSunday(year, 3, 2);
        return day >= secondSunday;
    }
    
    // November: check if before first Sunday
    if (month === 10) {
        const firstSunday = getNthSunday(year, 11, 1);
        return day < firstSunday;
    }
    
    return false;
}

// Get the nth Sunday of a given month
function getNthSunday(year, month, n) {
    const firstDay = new Date(year, month - 1, 1);
    const firstDayOfWeek = firstDay.getDay(); // 0 = Sunday
    const daysUntilFirstSunday = (7 - firstDayOfWeek) % 7;
    const firstSunday = 1 + daysUntilFirstSunday;
    return firstSunday + (n - 1) * 7;
}

// Update timezone info display
function updateTimezoneInfo() {
    const now = new Date();
    const isDST = isDaylightSavingTime(now);
    const timezoneText = isDST ? 'MDT' : 'MST';
    const timezoneElement = document.getElementById('timezoneInfo');
    if (timezoneElement) {
        timezoneElement.textContent = `All times in ${timezoneText}`;
    }
}

// Format date as YYYY-MM-DD key
function formatDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Format time in Mountain Time
function formatTimeMT(utcDate) {
    // Convert UTC to Mountain Time using proper timezone handling
    const date = new Date(utcDate);
    
    // Format in Mountain Time (America/Denver handles MST/MDT automatically)
    const options = {
        timeZone: 'America/Denver',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    };
    
    const mtTimeString = date.toLocaleString('en-US', options);
    // Return time without "MT" suffix
    return mtTimeString;
}

// Setup swipe gestures for month navigation
function setupSwipeGestures() {
    const calendarContainer = document.querySelector('.calendar-container');
    if (!calendarContainer) return;
    
    calendarContainer.addEventListener('touchstart', handleTouchStart, { passive: true });
    calendarContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
    calendarContainer.addEventListener('touchend', handleTouchEnd, { passive: true });
}

// Handle touch start
function handleTouchStart(e) {
    // Don't handle swipes if modal is open
    const modal = document.getElementById('gameModal');
    if (modal && modal.classList.contains('active')) {
        return;
    }
    
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
}

// Handle touch move (optional - can be used to prevent scrolling during horizontal swipe)
function handleTouchMove(e) {
    if (touchStartX === null) return;
    
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartX);
    const deltaY = Math.abs(touch.clientY - touchStartY);
    
    // Only prevent scrolling if it's clearly a horizontal swipe (horizontal > vertical by significant margin)
    // This allows normal vertical scrolling while enabling horizontal swipes
    if (deltaX > 30 && deltaX > deltaY * 1.5) {
        e.preventDefault();
    }
}

// Handle touch end and detect swipe
function handleTouchEnd(e) {
    if (touchStartX === null) return;
    
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);
    
    // Check if it's a horizontal swipe (not vertical scroll)
    if (absDeltaX > SWIPE_THRESHOLD && absDeltaX > absDeltaY && absDeltaY < SWIPE_MAX_VERTICAL) {
        // Swipe right (previous month)
        if (deltaX > 0) {
            const prevBtn = document.getElementById('prevMonth');
            if (prevBtn && !prevBtn.classList.contains('disabled')) {
                navigateMonth(-1);
            }
        }
        // Swipe left (next month)
        else if (deltaX < 0) {
            const nextBtn = document.getElementById('nextMonth');
            if (nextBtn && !nextBtn.classList.contains('disabled')) {
                navigateMonth(1);
            }
        }
    }
    
    // Reset touch start
    touchStartX = null;
    touchStartY = null;
}

// Navigate to previous/next month
function navigateMonth(direction) {
    const wrapper = document.getElementById('calendarGridWrapper');
    if (!wrapper) {
        // Fallback if wrapper doesn't exist
        performNavigation(direction);
        return;
    }
    
    // Determine animation classes based on direction
    // direction > 0 means next month (slide left), direction < 0 means previous month (slide right)
    const slideOutClass = direction > 0 ? 'slide-left' : 'slide-right';
    const slideInClass = direction > 0 ? 'slide-in-left' : 'slide-in-right';
    
    // Remove any existing animation classes
    wrapper.classList.remove('slide-left', 'slide-right', 'slide-in-left', 'slide-in-right');
    
    // Add slide-out animation
    wrapper.classList.add(slideOutClass);
    
    // Wait for slide-out animation to complete, then update and slide in
    setTimeout(() => {
        // Update month
        performNavigation(direction);
        
        // Remove slide-out class and add slide-in class
        wrapper.classList.remove(slideOutClass);
        wrapper.classList.add(slideInClass);
        
        // Remove slide-in class after animation completes
        setTimeout(() => {
            wrapper.classList.remove(slideInClass);
        }, 200);
    }, 200);
}

// Perform the actual navigation logic
function performNavigation(direction) {
    currentMonth += direction;
    
    // Handle year wrap-around
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    } else if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    
    // Constrain to season months (Sep-April)
    constrainToSeasonMonths();
    
    // Don't constrain to only months with games - allow viewing empty months
    // constrainToAvailableMonths(); // Removed to allow viewing all season months
    
    renderCalendar();
}

// Constrain navigation to season months (September - April)
function constrainToSeasonMonths() {
    // Season spans Sep (8) to Apr (3) across two years
    // If we're in May-August (4-7), constrain to nearest season month
    if (currentMonth > CONFIG.endMonth && currentMonth < CONFIG.startMonth) {
        // We're in the off-season (May-August)
        // If navigating forward, go to September
        // If navigating backward, go to April
        // For simplicity, default to September
        currentMonth = CONFIG.startMonth;
    }
}

// Constrain navigation to available months only
function constrainToAvailableMonths() {
    if (availableMonths.length === 0) return;
    
    const currentKey = `${currentYear}-${currentMonth}`;
    const currentIndex = availableMonths.findIndex(m => 
        `${m.year}-${m.month}` === currentKey
    );
    
    if (currentIndex === -1) {
        // Current month not available, find closest
        const now = new Date(currentYear, currentMonth);
        let closest = availableMonths[0];
        let minDiff = Math.abs(now - new Date(closest.year, closest.month));
        
        availableMonths.forEach(m => {
            const diff = Math.abs(now - new Date(m.year, m.month));
            if (diff < minDiff) {
                minDiff = diff;
                closest = m;
            }
        });
        
        currentYear = closest.year;
        currentMonth = closest.month;
    }
}

// Check if month is available (now only checks if in season, not if it has games)
function isMonthAvailable(year, month) {
    // Only check if it's in season (Sep-April)
    // Season months: Sep (8), Oct (9), Nov (10), Dec (11), Jan (0), Feb (1), Mar (2), Apr (3)
    // Off-season: May (4), Jun (5), Jul (6), Aug (7)
    const isInSeason = month >= CONFIG.startMonth || month <= CONFIG.endMonth;
    return isInSeason;
    
    // Note: We used to also check if the month has games, but now we allow
    // viewing all season months even if they're empty, for better UX
}

// Render the calendar
function renderCalendar() {
    if (!scheduleData) {
        document.getElementById('calendarGrid').innerHTML = 
            '<div class="loading">Loading schedule...</div>';
        return;
    }
    
    // Update month/year display
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    document.getElementById('monthYear').textContent = 
        `${monthNames[currentMonth]} ${currentYear}`;
    
    // Update navigation buttons
    const prevBtn = document.getElementById('prevMonth');
    const nextBtn = document.getElementById('nextMonth');
    
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    
    if (isMonthAvailable(prevYear, prevMonth)) {
        prevBtn.classList.remove('disabled');
    } else {
        prevBtn.classList.add('disabled');
    }
    
    if (isMonthAvailable(nextYear, nextMonth)) {
        nextBtn.classList.remove('disabled');
    } else {
        nextBtn.classList.add('disabled');
    }
    
    // Generate calendar grid
    const grid = document.getElementById('calendarGrid');
    grid.innerHTML = '';
    
    // Add day headers
    const dayHeaders = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    dayHeaders.forEach(day => {
        const header = document.createElement('div');
        header.className = 'day-header';
        header.textContent = day;
        grid.appendChild(header);
    });
    
    // Get first day of month and number of days
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day empty';
        grid.appendChild(emptyDay);
    }
    
    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentYear, currentMonth, day);
        const dateKey = formatDateKey(date);
        const game = scheduleData[dateKey];
        
        const dayCell = document.createElement('div');
        dayCell.className = 'calendar-day';
        
        if (game) {
            dayCell.classList.add(game.isHome ? 'home' : 'away');
            
            const dayNumber = document.createElement('div');
            dayNumber.className = 'day-number';
            dayNumber.textContent = day;
            dayCell.appendChild(dayNumber);
            
            const gameContent = document.createElement('div');
            gameContent.className = 'game-content';
            
            // Opponent logo - use dark logo for home games (red background), regular for away games (white background)
            const logo = document.createElement('img');
            logo.className = 'opponent-logo';
            logo.src = game.isHome ? game.opponent.darkLogo : game.opponent.logo;
            logo.alt = game.opponent.name;
            gameContent.appendChild(logo);
            
            // Game info (time or result)
            const gameInfo = document.createElement('div');
            gameInfo.className = 'game-info';
            
            if (game.result) {
                const result = document.createElement('div');
                result.className = 'game-result';
                result.textContent = game.result;
                gameInfo.appendChild(result);
            } else if (game.time) {
                const time = document.createElement('div');
                time.className = 'game-time';
                time.textContent = game.time;
                gameInfo.appendChild(time);
            }
            
            gameContent.appendChild(gameInfo);
            dayCell.appendChild(gameContent);
            
            // Add click handler for game cells
            dayCell.addEventListener('click', () => openGameModal(game));
        } else {
            dayCell.classList.add('empty');
            const dayNumber = document.createElement('div');
            dayNumber.className = 'day-number';
            dayNumber.textContent = day;
            dayCell.appendChild(dayNumber);
        }
        
        grid.appendChild(dayCell);
    }
}

// Render broadcast logos in the modal
function renderBroadcastLogos(container, broadcasts) {
    // Clear existing content
    container.innerHTML = '';
    
    if (!broadcasts || broadcasts.length === 0) {
        return;
    }
    
    // Filter to only Canadian broadcasts (countryCode === "CA")
    const canadianBroadcasts = broadcasts.filter(broadcast => broadcast.countryCode === 'CA');
    
    if (canadianBroadcasts.length === 0) {
        return;
    }
    
    // Remove duplicates by ID (in case same network appears multiple times)
    const uniqueBroadcasts = canadianBroadcasts.filter((broadcast, index, self) =>
        index === self.findIndex(b => b.id === broadcast.id)
    );
    
    // Map of broadcast IDs to text labels
    const textOnlyBroadcasts = {
        292: 'TSN3',
        293: 'TSN4',
        294: 'TSN5',
        230: 'RDS2',
        33: 'RDS'
    };
    
    uniqueBroadcasts.forEach(broadcast => {
        // Check if this broadcast should display as text only
        if (textOnlyBroadcasts[broadcast.id]) {
            const textSpan = document.createElement('span');
            textSpan.textContent = textOnlyBroadcasts[broadcast.id];
            textSpan.className = 'broadcast-text';
            textSpan.title = broadcast.network || 'Broadcast';
            container.appendChild(textSpan);
        } else {
            // Display as logo image
            const logoImg = document.createElement('img');
            logoImg.src = `https://assets.nhle.com/logos/broadcast/${broadcast.id}.svg`;
            logoImg.alt = broadcast.network || 'Broadcast';
            logoImg.className = 'broadcast-logo';
            // Add class for broadcast ID 4 to exclude from inversion
            if (broadcast.id === 4) {
                logoImg.classList.add('broadcast-logo-no-invert');
            }
            logoImg.title = broadcast.network || 'Broadcast';
            container.appendChild(logoImg);
        }
    });
}

// Format date as "Jan 13, 2026" for modal
function formatModalDate(date) {
    const monthNames = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    const month = monthNames[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
}

// Format date for display
function formatDisplayDate(date) {
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[date.getDay()];
    const monthName = monthNames[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    return `${dayName}, ${monthName} ${day}, ${year}`;
}

// Open game modal with game details
function openGameModal(game) {
    const modal = document.getElementById('gameModal');
    if (!modal) return;
    
    // Get current team info
    const teamInfo = getTeamInfo();
    
    // Determine team order: For home games, opponent is left, team is right
    // For away games, team is left, opponent is right
    const isHome = game.isHome;
    const teamLogo = isHome ? teamInfo.logoHome : teamInfo.logoAway;
    const opponentLogo = isHome ? game.opponent.darkLogo : game.opponent.logo;
    
    // Set left team (opponent for home, team for away)
    if (isHome) {
        // Home game: opponent on left
        document.getElementById('modalLeftTeamLogo').src = opponentLogo;
        document.getElementById('modalLeftTeamLogo').alt = game.opponent.name;
        document.getElementById('modalLeftTeamAbbrev').textContent = game.opponent.abbrev;
        document.getElementById('modalLeftTeamName').textContent = game.opponent.name;
        if (game.opponentScore !== null && game.opponentScore !== undefined) {
            document.getElementById('modalLeftTeamScore').textContent = game.opponentScore;
            document.getElementById('modalLeftTeamScore').style.display = 'block';
        } else {
            document.getElementById('modalLeftTeamScore').style.display = 'none';
        }
    } else {
        // Away game: team on left
        document.getElementById('modalLeftTeamLogo').src = teamLogo;
        document.getElementById('modalLeftTeamLogo').alt = teamInfo.fullName;
        document.getElementById('modalLeftTeamAbbrev').textContent = teamInfo.abbrev;
        document.getElementById('modalLeftTeamName').textContent = teamInfo.name;
        if (game.flamesScore !== null && game.flamesScore !== undefined) {
            document.getElementById('modalLeftTeamScore').textContent = game.flamesScore;
            document.getElementById('modalLeftTeamScore').style.display = 'block';
        } else {
            document.getElementById('modalLeftTeamScore').style.display = 'none';
        }
    }
    
    // Set right team (team for home, opponent for away)
    if (isHome) {
        // Home game: team on right
        document.getElementById('modalRightTeamLogo').src = teamLogo;
        document.getElementById('modalRightTeamLogo').alt = teamInfo.fullName;
        document.getElementById('modalRightTeamAbbrev').textContent = teamInfo.abbrev;
        document.getElementById('modalRightTeamName').textContent = teamInfo.name;
        if (game.flamesScore !== null && game.flamesScore !== undefined) {
            document.getElementById('modalRightTeamScore').textContent = game.flamesScore;
            document.getElementById('modalRightTeamScore').style.display = 'block';
        } else {
            document.getElementById('modalRightTeamScore').style.display = 'none';
        }
    } else {
        // Away game: opponent on right
        document.getElementById('modalRightTeamLogo').src = opponentLogo;
        document.getElementById('modalRightTeamLogo').alt = game.opponent.name;
        document.getElementById('modalRightTeamAbbrev').textContent = game.opponent.abbrev;
        document.getElementById('modalRightTeamName').textContent = game.opponent.name;
        if (game.opponentScore !== null && game.opponentScore !== undefined) {
            document.getElementById('modalRightTeamScore').textContent = game.opponentScore;
            document.getElementById('modalRightTeamScore').style.display = 'block';
        } else {
            document.getElementById('modalRightTeamScore').style.display = 'none';
        }
    }
    
    // Set date - handle both Date objects and ISO strings
    // Fix timezone issue by parsing date as local date instead of UTC
    let gameDate;
    if (game.date instanceof Date) {
        gameDate = game.date;
    } else {
        // Parse as local date to avoid timezone shift
        const dateStr = game.date.split('T')[0]; // Get just the date part (YYYY-MM-DD)
        const [year, month, day] = dateStr.split('-');
        gameDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    const formattedDate = formatModalDate(gameDate);
    document.getElementById('modalGameDate').textContent = formattedDate;
    
    // Display sponsor information if available
    const sponsorSection = document.getElementById('modalSponsor');
    const sponsorLabel = document.getElementById('modalSponsorLabel');
    const sponsorLogo = document.getElementById('modalSponsorLogo');
    const sponsorText = document.getElementById('modalSponsorText');
    
    // Check for sponsor by game ID first, then by date
    const dateKey = formatDateKey(gameDate);
    let sponsor = null;
    if (game.id && sponsorData[game.id]) {
        sponsor = sponsorData[game.id];
    } else if (sponsorData[dateKey]) {
        sponsor = sponsorData[dateKey];
    }
    
    if (sponsor && sponsor.logo) {
        sponsorSection.style.display = 'block';
        sponsorLabel.textContent = sponsor.label || 'Presented By:';
        sponsorLogo.src = sponsor.logo;
        sponsorLogo.alt = sponsor.text || 'Sponsor';
        if (sponsor.text) {
            sponsorText.textContent = sponsor.text;
            sponsorText.style.display = 'block';
        } else {
            sponsorText.style.display = 'none';
        }
        // Add class to modal for sponsor-specific styling
        modal.classList.add('has-sponsor');
        console.log('Added has-sponsor class to modal');
    } else {
        sponsorSection.style.display = 'none';
        // Remove sponsor class
        modal.classList.remove('has-sponsor');
    }
    
    // Set venue
    document.getElementById('modalGameVenue').textContent = game.venue;
    
    // Add home/away class to modal content
    const modalContent = document.querySelector('.modal-content');
    if (modalContent) {
        if (isHome) {
            modalContent.classList.add('home-game');
            modalContent.classList.remove('away-game');
        } else {
            modalContent.classList.add('away-game');
            modalContent.classList.remove('home-game');
        }
    }
    
    // Handle modal header border - remove for future away games
    const modalHeader = document.querySelector('.modal-header');
    const modalFooter = document.querySelector('.modal-footer');
    if (modalHeader && modalFooter) {
        // Remove border for future away games (has time but no result, and is away game)
        // Also check gameState to be more specific about future games
        const isFutureAwayGame = !isHome && !game.result && (game.time || game.gameState === 'FUT' || game.gameState === 'PRE');
        const isPastGame = game.result !== null && game.result !== undefined;
        
        if (isFutureAwayGame) {
            modalHeader.classList.add('no-border');
            modalHeader.classList.remove('past-game');
            // Add border to footer when header border is removed (for future away games)
            modalFooter.classList.add('has-top-border');
        } else {
            modalHeader.classList.remove('no-border');
            // Remove footer border when header border is present
            modalFooter.classList.remove('has-top-border');
            
            // Add extra padding for past games
            if (isPastGame) {
                modalHeader.classList.add('past-game');
            } else {
                modalHeader.classList.remove('past-game');
            }
        }
    }
    
    // Handle game state display
    const statusContainer = document.getElementById('modalGameStatus');
    const timeContainer = document.getElementById('modalGameTimeContainer');
    const broadcastContainer = document.getElementById('modalGameBroadcast');
    const ticketsBtn = document.getElementById('modalTicketsBtn');
    const previewBtn = document.getElementById('modalPreviewBtn');
    const summaryBtn = document.getElementById('modalSummaryBtn');
    
    if (game.result) {
        // Game has been played - show FINAL status
        let finalText = 'FINAL';
        if (game.periodType === 'OT') {
            finalText = 'FINAL OT';
        } else if (game.periodType === 'SO') {
            finalText = 'FINAL SO';
        }
        document.getElementById('modalGameStatusText').textContent = finalText;
        statusContainer.style.display = 'flex';
        timeContainer.style.display = 'none';
        broadcastContainer.style.display = 'none';
        
        ticketsBtn.style.display = 'none';
        previewBtn.style.display = 'none';
        summaryBtn.style.display = 'inline-block';
        summaryBtn.href = getGameDetailUrl(game.id);
    } else if (game.time) {
        // Upcoming or live game - show time
        document.getElementById('modalGameTime').textContent = game.time;
        statusContainer.style.display = 'none';
        timeContainer.style.display = 'block';
        
        // Show broadcast logos for future games if available
        if (game.tvBroadcasts && game.tvBroadcasts.length > 0) {
            broadcastContainer.style.display = 'flex';
            renderBroadcastLogos(document.getElementById('modalBroadcastLogos'), game.tvBroadcasts);
        } else {
            broadcastContainer.style.display = 'none';
        }
        
        // Show buttons based on game type
        if (game.isHome && game.ticketsLink) {
            // Home games: Show both Buy Tickets and Game Preview buttons
            ticketsBtn.style.display = 'inline-block';
            ticketsBtn.href = game.ticketsLink;
            ticketsBtn.style.opacity = '1';
            ticketsBtn.style.pointerEvents = 'auto';
            previewBtn.style.display = 'inline-block';
            previewBtn.href = getGameDetailUrl(game.id);
        } else if (!game.isHome) {
            // Away games: Show Game Preview button only
            ticketsBtn.style.display = 'none';
            previewBtn.style.display = 'inline-block';
            previewBtn.href = getGameDetailUrl(game.id);
        } else {
            // No tickets link available for home game
            ticketsBtn.style.display = 'none';
            previewBtn.style.display = 'inline-block';
            previewBtn.href = getGameDetailUrl(game.id);
        }
        summaryBtn.style.display = 'none';
    } else {
        // TBD game
        statusContainer.style.display = 'none';
        timeContainer.style.display = 'none';
        
        if (game.tvBroadcasts && game.tvBroadcasts.length > 0) {
            broadcastContainer.style.display = 'flex';
            renderBroadcastLogos(document.getElementById('modalBroadcastLogos'), game.tvBroadcasts);
        } else {
            broadcastContainer.style.display = 'none';
        }
        
        ticketsBtn.style.display = 'none';
        previewBtn.style.display = 'none';
        summaryBtn.style.display = 'none';
    }
    
    // Show modal
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Close game modal
function closeGameModal() {
    const modal = document.getElementById('gameModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

