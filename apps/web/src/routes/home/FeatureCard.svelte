<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    title: string;
    description: string;
    icon: Snippet;
  }

  let { title, description, icon }: Props = $props();
</script>

<div class="feature-card">
  <div class="feature-icon">
    {@render icon()}
  </div>
  <h3>{title}</h3>
  <p>{description}</p>
</div>

<style>
  .feature-card {
    text-align: center;
    padding: 1.25rem 0.75rem;
    border-radius: 12px;
  }

  .feature-icon {
    margin-bottom: 0.75rem;
    color: #6b8cce;
    transition: transform 0.3s;
  }

  .feature-card:hover .feature-icon {
    transform: scale(1.1);
  }

  .feature-card:hover .feature-icon :global(svg) {
    animation: iconBounce 0.5s ease;
  }

  @keyframes iconBounce {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-4px);
    }
  }

  .feature-icon :global(svg) {
    display: block;
    margin: 0 auto;
  }

  .feature-card h3 {
    font-size: 0.95rem;
    font-weight: 700;
    color: #374151;
    margin-bottom: 0.4rem;
  }

  .feature-card p {
    font-size: 0.75rem;
    color: #6b7280;
    line-height: 1.4;
  }
</style>
