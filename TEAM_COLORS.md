# Team Configuration

Each team has its own primary color and deep link configuration that is applied throughout the calendar interface.

## Current Team Colors

| Team | Color Hex | Color Name |
|------|-----------|------------|
| **Flames** | `#C8102E` | Flames Red |
| **Hitmen** | `#C8102E` | Hitmen Red |
| **Roughnecks** | `#00205B` | Navy Blue |
| **Stampeders** | `#C8102E` | Red |
| **Wranglers** | `#862633` | Maroon |

## How It Works

The team color is automatically applied when the page loads:
- **Navigation arrows** (hover state)
- **Home game calendar tiles**
- **Legend home game indicator**
- **Game modal background** (home games)
- **Button primary colors**
- **"Add to Calendar" button**

## Changing Team Colors

To change a team's primary color, edit `/public/calendar.js`:

```javascript
const teamConfigs = {
    flames: { 
        // ... other properties
        color: '#C8102E',  // <- Change this hex color
    },
    hitmen: { 
        color: '#C8102E',
    },
    // etc...
};
```

After changing:
1. Upload the updated `calendar.js` to S3 → `public/calendar.js`
2. Invalidate CloudFront: `/calendar.js`
3. Hard refresh your browser

## Dynamic Page Titles

The page title is also dynamically set based on the team:
- **Flames**: "Calgary Flames Schedule"
- **Hitmen**: "Calgary Hitmen Schedule"
- **Roughnecks**: "Calgary Roughnecks Schedule"
- **Stampeders**: "Calgary Stampeders Schedule"
- **Wranglers**: "Calgary Wranglers Schedule"

This happens automatically via JavaScript, so the HTML `<title>` tags are just fallbacks.

## Game Detail Deep Links

Each team has its own deep link format for Game Preview and Game Summary buttons:

### Current Deep Link Configurations

| Team | URL Format |
|------|------------|
| **Flames** | `fr-calgary-flames://open_alliance_webview?id={game_id}&persona_lookup_key=calgary_flames_nhl&component_lookup_key=nhl_game_detail` |
| **Hitmen** | `fr-calgary-hitmen://open_alliance_webview?id={game_id}&persona_lookup_key=calgary_hitmen_app&component_lookup_key=chl_game_detail` |
| **Roughnecks** | `fr-calgary-roughnecks://open_alliance_webview?id={game_id}&persona_lookup_key=calgary_roughnecks_nll&component_lookup_key=nll_game_detail` |
| **Stampeders** | `fr-calgary-stampeders://open_alliance_webview?id={game_id}&persona_lookup_key=calgary_stampeders_cfl&component_lookup_key=cfl_game_detail` |
| **Wranglers** | `fr-calgary-wranglers://open_alliance_webview?id={game_id}&persona_lookup_key=calgary_wranglers_ahl&component_lookup_key=ahl_game_detail` |

### Changing Deep Links

To change a team's deep link format, edit the `getGameDetailUrl()` function in `/public/calendar.js`:

```javascript
function getGameDetailUrl(gameId) {
    const urlConfigs = {
        hitmen: `fr-calgary-hitmen://open_alliance_webview?id=${gameId}&persona_lookup_key=calgary_hitmen_app&component_lookup_key=chl_game_detail`,
        // ... other teams
    };
    return urlConfigs[TEAM_KEY] || urlConfigs.flames;
}
```

After changing, upload to S3 and invalidate CloudFront.

