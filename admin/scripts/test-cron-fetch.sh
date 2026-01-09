#!/bin/bash

# Test the automated schedule fetcher
# Usage: ./test-cron-fetch.sh [url] [secret]

URL="${1:-http://localhost:3000/api/cron/fetch-all-schedules}"
CRON_SECRET="${2:-test-secret}"

echo "🧪 Testing automated schedule fetcher..."
echo "URL: $URL"
echo ""

if [[ "$URL" == *"localhost"* ]]; then
    echo "⚠️  Testing locally - make sure admin dev server is running:"
    echo "   cd admin && npm run dev"
    echo ""
fi

echo "🔄 Sending request..."
echo ""

response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X GET "$URL" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json")

http_body=$(echo "$response" | sed -e 's/HTTP_STATUS\:.*//g')
http_status=$(echo "$response" | tr -d '\n' | sed -e 's/.*HTTP_STATUS://')

echo "Status: $http_status"
echo ""

if [ "$http_status" -eq 200 ]; then
    echo "✅ Success!"
    echo ""
    echo "Response:"
    echo "$http_body" | jq .
else
    echo "❌ Failed!"
    echo ""
    echo "Response:"
    echo "$http_body"
fi
