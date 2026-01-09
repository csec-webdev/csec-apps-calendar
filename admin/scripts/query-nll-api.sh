#!/bin/bash

# Query Champion Data NLL API Helper Script
# Usage: ./query-nll-api.sh <username> <password> <endpoint>

if [ "$#" -lt 2 ]; then
    echo "Usage: $0 <username> <password> [endpoint]"
    echo ""
    echo "Endpoints:"
    echo "  leagues         - Get all leagues"
    echo "  levels          - Get all NLL levels/seasons"
    echo "  squads          - Get all NLL squads/teams"
    echo "  fixtures <squadId> <levelId> - Get fixtures for a specific squad"
    echo ""
    echo "Example:"
    echo "  $0 myuser mypass squads"
    exit 1
fi

USERNAME="$1"
PASSWORD="$2"
ENDPOINT="${3:-squads}"
BASE_URL="https://api.nll.championdata.io"

# Create base64 encoded credentials
AUTH=$(echo -n "$USERNAME:$PASSWORD" | base64)

case "$ENDPOINT" in
    leagues)
        URL="$BASE_URL/v1/leagues"
        ;;
    levels)
        URL="$BASE_URL/v1/leagues/1/levels"
        ;;
    squads)
        URL="$BASE_URL/v1/leagues/1/squads"
        ;;
    fixtures)
        SQUAD_ID="$4"
        LEVEL_ID="$5"
        if [ -z "$SQUAD_ID" ] || [ -z "$LEVEL_ID" ]; then
            echo "Error: fixtures requires squadId and levelId"
            echo "Usage: $0 <username> <password> fixtures <squadId> <levelId>"
            exit 1
        fi
        URL="$BASE_URL/v1/leagues/1/levels/$LEVEL_ID/squads/$SQUAD_ID/fixtures"
        ;;
    *)
        echo "Unknown endpoint: $ENDPOINT"
        exit 1
        ;;
esac

echo "Querying: $URL"
echo ""

curl -X GET "$URL" \
  -H "Authorization: Basic $AUTH" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" | jq .

echo ""
