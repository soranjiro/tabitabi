<script lang="ts">
  import type { PreviewItinerary } from "../../previewData/types";
  import "../styles/map-only.css";
  export let preview: PreviewItinerary;
</script>

<div class="map-preview">
  <div class="map-container">
    <svg viewBox="0 0 200 120" class="map-svg">
      <rect width="200" height="120" fill="#e5e7eb" />
      <path
        d="M0 40 Q50 30 80 60 T150 50 T200 80"
        stroke="white"
        stroke-width="8"
        fill="none"
      />
      <path
        d="M40 0 Q50 50 30 120"
        stroke="white"
        stroke-width="6"
        fill="none"
      />
      <g transform="translate(60, 40)">
        <circle cx="0" cy="0" r="4" fill="#ef4444" />
        <path d="M0 0 L0 -8" stroke="#ef4444" stroke-width="2" />
        <circle cx="0" cy="-8" r="5" fill="#ef4444" />
        <circle cx="0" cy="-8" r="2" fill="white" />
      </g>
      <g transform="translate(120, 70)">
        <circle cx="0" cy="0" r="4" fill="#3b82f6" />
        <path d="M0 0 L0 -8" stroke="#3b82f6" stroke-width="2" />
        <circle cx="0" cy="-8" r="5" fill="#3b82f6" />
        <circle cx="0" cy="-8" r="2" fill="white" />
      </g>
      <g transform="translate(160, 30)">
        <circle cx="0" cy="0" r="4" fill="#10b981" />
        <path d="M0 0 L0 -8" stroke="#10b981" stroke-width="2" />
        <circle cx="0" cy="-8" r="5" fill="#10b981" />
        <circle cx="0" cy="-8" r="2" fill="white" />
      </g>
    </svg>
    <div class="map-card-float top-left">
      <span class="map-card-icon">📍</span>
      <span class="map-card-text">浅草寺</span>
    </div>
    <div class="map-card-float bottom-right">
      <span class="map-card-icon">🗼</span>
      <span class="map-card-text">スカイツリー</span>
    </div>
  </div>
</div>
