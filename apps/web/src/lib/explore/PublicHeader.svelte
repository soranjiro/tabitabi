<script lang="ts">
  let { active = "" }: { active?: "explore" | "create" | "profile" | "" } = $props();
</script>

<header class="site-header">
  <div class="inner">
    <a class="brand" href="/" aria-label="たびたび ホーム">
      <span class="plane" aria-hidden="true">✈</span>
      <strong>たびたび</strong>
    </a>

    <nav aria-label="メインナビゲーション">
      <a class:active={active === "explore"} href="/explore">みんなのしおり</a>
      <a class="profile" href="/profile">マイページ</a>
      <a class="create" class:active={active === "create"} href="/#create">しおりを作る</a>
    </nav>
  </div>
</header>

<style>
  .site-header {
    position: relative;
    z-index: 30;
    border-bottom: 1px solid #e7ecf6;
    background: rgba(255, 255, 255, 0.94);
    backdrop-filter: blur(14px);
  }

  .inner {
    display: flex;
    width: min(1080px, calc(100% - 32px));
    height: 68px;
    margin: 0 auto;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
  }

  .brand {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: #243b63;
    text-decoration: none;
  }

  .plane {
    color: #588bea;
    font-size: 21px;
    transform: rotate(-18deg);
  }

  .brand strong {
    font-size: 18px;
    font-weight: 900;
    letter-spacing: 0.04em;
  }

  nav {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  nav a {
    padding: 9px 12px;
    border-radius: 999px;
    color: #64748b;
    text-decoration: none;
    font-size: 12px;
    font-weight: 700;
  }

  nav a:hover,
  nav a.active {
    color: #315da8;
    background: #f0f5ff;
  }

  nav .create {
    margin-left: 4px;
    padding: 10px 16px;
    color: white;
    background: linear-gradient(135deg, #5ca4ee, #7b88ec);
    box-shadow: 0 7px 18px rgba(88, 124, 220, 0.2);
  }

  nav .create:hover,
  nav .create.active {
    color: white;
    background: linear-gradient(135deg, #4b91de, #6977db);
  }

  @media (max-width: 620px) {
    .inner {
      width: calc(100% - 24px);
      height: 60px;
    }

    .profile {
      display: none;
    }

    nav a {
      padding: 8px;
      font-size: 11px;
    }

    nav .create {
      padding: 9px 11px;
    }
  }
</style>
