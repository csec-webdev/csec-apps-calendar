# WHL Team IDs and Logo File Names

When uploading opponent logos for the Calgary Hitmen, use these team IDs as the file names.

## WHL Teams (2024-2025 Season)

### U.S. Division
| Team | Team ID | File Name |
|------|---------|-----------|
| Everett Silvertips | 217 | `217.png` |
| Portland Winterhawks | 203 | `203.png` |
| Seattle Thunderbirds | 215 | `215.png` |
| Spokane Chiefs | 205 | `205.png` |
| Tri-City Americans | 216 | `216.png` |
| Wenatchee Wild | 226 | `226.png` |

### B.C. Division
| Team | Team ID | File Name |
|------|---------|-----------|
| Kamloops Blazers | 204 | `204.png` |
| Kelowna Rockets | 218 | `218.png` |
| Prince George Cougars | 211 | `211.png` |
| Vancouver Giants | 214 | `214.png` |
| Victoria Royals | 227 | `227.png` |

### Central Division
| Team | Team ID | File Name |
|------|---------|-----------|
| Calgary Hitmen | 202 | `202.png` |
| Edmonton Oil Kings | 212 | `212.png` |
| Lethbridge Hurricanes | 219 | `219.png` |
| Medicine Hat Tigers | 206 | `206.png` |
| Red Deer Rebels | 213 | `213.png` |

### East Division
| Team | Team ID | File Name |
|------|---------|-----------|
| Brandon Wheat Kings | 220 | `220.png` |
| Moose Jaw Warriors | 207 | `207.png` |
| Prince Albert Raiders | 221 | `221.png` |
| Regina Pats | 208 | `208.png` |
| Saskatoon Blades | 209 | `209.png` |
| Swift Current Broncos | 210 | `210.png` |
| Winnipeg ICE | 222 | `222.png` |

## Upload Locations

### Local Development:
```
/Users/jjohnson/csec-app-calendar/public/assets/opponents/whl/{team_id}.png
```

### S3 Production:
```
s3://csec-app-calendar/public/assets/opponents/whl/{team_id}.png
```

### CloudFront URL:
```
https://YOUR-CLOUDFRONT-DOMAIN/assets/opponents/whl/{team_id}.png
```

## Finding Team IDs

If you need to find a team ID from the WHL API response:
1. The team ID is in the `teamLink` property: `prop.visiting_team_city.teamLink` or `prop.home_team_city.teamLink`
2. You can also check the WHL website URLs - they often include the team ID
3. The external logo URL format is: `https://assets.leaguestat.com/whl/logos/{team_id}.png`

## Logo Format Recommendations

- **Format**: PNG with transparent background
- **Size**: 500x500px (or larger, will scale down)
- **Quality**: High resolution for crisp display on all devices
- **Naming**: Use team ID as the file name (e.g., `214.png` not `vancouver-giants.png`)

