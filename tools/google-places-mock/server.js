#!/usr/bin/env node
import http from 'node:http';

const port = Number(process.env.PORT || 8789);
const host = process.env.HOST || '127.0.0.1';

const places = [
  {
    id: 'mock-google-place-tokyo-station',
    displayName: { text: '東京駅' },
    formattedAddress: '日本、〒100-0005 東京都千代田区丸の内１丁目',
    location: { latitude: 35.681236, longitude: 139.767125 },
    googleMapsUri: 'https://maps.google.com/?cid=mock-tokyo-station',
    types: ['train_station', 'transit_station', 'point_of_interest'],
    addressComponents: [
      { longText: '東京都', shortText: '東京都', types: ['administrative_area_level_1', 'political'], languageCode: 'ja' },
      { longText: '千代田区', shortText: '千代田区', types: ['locality', 'political'], languageCode: 'ja' },
    ],
  },
  {
    id: 'mock-google-place-tokyo-tower',
    displayName: { text: '東京タワー' },
    formattedAddress: '日本、〒105-0011 東京都港区芝公園４丁目２−８',
    location: { latitude: 35.658581, longitude: 139.745433 },
    googleMapsUri: 'https://maps.google.com/?cid=mock-tokyo-tower',
    types: ['tourist_attraction', 'point_of_interest'],
  },
  {
    id: 'mock-google-place-asakusa',
    displayName: { text: '浅草寺' },
    formattedAddress: '日本、〒111-0032 東京都台東区浅草２丁目３−１',
    location: { latitude: 35.714765, longitude: 139.796655 },
    googleMapsUri: 'https://maps.google.com/?cid=mock-sensoji',
    types: ['tourist_attraction', 'place_of_worship', 'point_of_interest'],
  },
];

function sendJson(response, status, body) {
  response.writeHead(status, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Goog-Api-Key,X-Goog-FieldMask',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Content-Type': 'application/json; charset=utf-8',
  });
  response.end(JSON.stringify(body));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
    });
    request.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
  });
}

function toSuggestion(place) {
  return {
    placePrediction: {
      place: `places/${place.id}`,
      placeId: place.id,
      text: { text: `${place.displayName.text}, ${place.formattedAddress}` },
      structuredFormat: {
        mainText: { text: place.displayName.text },
        secondaryText: { text: place.formattedAddress },
      },
      types: place.types,
    },
  };
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host}`);

  if (request.method === 'OPTIONS') {
    sendJson(response, 204, {});
    return;
  }

  if (request.method === 'GET' && url.pathname === '/health') {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/v1/places:autocomplete') {
    try {
      const body = await readBody(request);
      const input = String(body.input || '').toLowerCase();
      const suggestions = places
        .filter((place) => {
          const haystack = `${place.displayName.text} ${place.formattedAddress}`.toLowerCase();
          return !input || haystack.includes(input) || input.includes('tokyo') || input.includes('東京');
        })
        .map(toSuggestion);
      sendJson(response, 200, { suggestions });
    } catch {
      sendJson(response, 400, { error: { message: 'Invalid JSON body' } });
    }
    return;
  }

  if (request.method === 'GET' && url.pathname.startsWith('/v1/places/')) {
    const placeId = decodeURIComponent(url.pathname.slice('/v1/places/'.length));
    const place = places.find((candidate) => candidate.id === placeId);
    if (!place) {
      sendJson(response, 404, { error: { message: `Unknown mock place: ${placeId}` } });
      return;
    }
    sendJson(response, 200, place);
    return;
  }

  sendJson(response, 404, { error: { message: 'Not found' } });
});

server.listen(port, host, () => {
  console.log(`Google Places mock server listening on http://${host}:${port}`);
});
