<script lang="ts">
  import type { PreviewItinerary } from "../../previewData/types";
  import "../styles/mapbox-journey.css";
  export let preview: PreviewItinerary;
</script>

<div class="journey-preview">
  <div class="journey-globe">
    <svg viewBox="0 0 200 100" class="journey-svg">
      <defs>
        <radialGradient id="globe-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#1e293b" />
          <stop offset="100%" stop-color="#0f172a" />
        </radialGradient>
      </defs>
      <rect width="200" height="120" fill="#020617" />
      <circle
        cx="100"
        cy="160"
        r="120"
        fill="url(#globe-grad)"
        stroke="#334155"
        stroke-width="1"
      />
      <path
        d="M60 100 Q80 80 100 90 T140 80"
        stroke="#334155"
        stroke-width="2"
        fill="none"
        opacity="0.5"
      />
      <path
        d="M50 90 Q100 40 150 80"
        stroke="#38bdf8"
        stroke-width="2"
        fill="none"
        stroke-dasharray="4 4"
      />
      <circle cx="50" cy="90" r="4" fill="#f472b6" />
      <circle cx="150" cy="80" r="4" fill="#f472b6" />
      <text x="100" y="60" font-size="12" text-anchor="middle">✈️</text>
    </svg>
  </div>
  <div class="journey-info">
    <div class="journey-route">
      <span class="journey-city">HND</span>
      <span class="journey-arrow">✈</span>
      <span class="journey-city">TPE</span>
    </div>
    <div class="journey-status">In Flight</div>
  </div>
</div>
