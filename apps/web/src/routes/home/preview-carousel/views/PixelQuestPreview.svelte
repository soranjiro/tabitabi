<script lang="ts">
  import type { PreviewItinerary } from "../../previewData/types";
  import "../styles/pixel-quest.css";
  export let preview: PreviewItinerary;
</script>

<div class="pq-preview">
  <div class="pq-map">
    <svg viewBox="0 0 200 100" class="pq-svg">
      <defs>
        <pattern
          id="pq-grass"
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
        >
          <rect width="8" height="8" fill="#7ec850" />
          <rect x="2" y="5" width="2" height="3" fill="#5b8c3e" />
          <rect x="6" y="6" width="1" height="2" fill="#5b8c3e" />
        </pattern>
      </defs>
      <rect width="200" height="100" fill="url(#pq-grass)" />
      <rect x="0" y="0" width="100" height="100" fill="#7ec850" opacity="0.3" />
      <rect
        x="100"
        y="0"
        width="100"
        height="100"
        fill="#d4a853"
        opacity="0.3"
      />
      <text
        x="50"
        y="12"
        text-anchor="middle"
        fill="#f4e8d3"
        font-size="8"
        font-weight="bold">DAY 1</text
      >
      <text
        x="150"
        y="12"
        text-anchor="middle"
        fill="#f4e8d3"
        font-size="8"
        font-weight="bold">DAY 2</text
      >
      <path
        d="M30 50 Q65 30 100 50 Q135 70 170 50"
        stroke="#8b7355"
        stroke-width="6"
        fill="none"
      />
      <path
        d="M30 50 Q65 30 100 50 Q135 70 170 50"
        stroke="#c4a86c"
        stroke-width="2"
        stroke-dasharray="4 4"
        fill="none"
      />
      <circle cx="30" cy="50" r="6" fill="#e85d3b" />
      <circle cx="100" cy="50" r="6" fill="#5d8a4a" />
      <circle cx="170" cy="50" r="6" fill="#5d8a4a" />
      <rect x="55" y="25" width="8" height="12" fill="#6b4423" />
      <rect x="51" y="18" width="16" height="10" fill="#3d8b3d" />
      <rect x="130" y="60" width="6" height="4" fill="#ffd700" />
      <rect x="75" y="70" width="10" height="8" fill="#8b7355" />
    </svg>
    <div class="pq-player">
      <div class="pq-player-body"></div>
    </div>
  </div>
  <div class="pq-quest-bar">
    <span class="pq-quest-icon">⚔️</span>
    <span class="pq-quest-text">{preview.steps[0]?.label}</span>
    <span class="pq-exp">+25 EXP</span>
  </div>
</div>
