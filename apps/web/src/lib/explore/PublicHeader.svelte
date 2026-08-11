<script lang="ts">
  let { active = "" }: { active?: "explore" | "create" | "profile" | "" } = $props();
</script>

<header class="public-header">
  <div class="header-inner">
    <a class="brand" href="/" aria-label="たびたび ホーム">
      <span class="brand-mark" aria-hidden="true">た</span>
      <span class="brand-copy">
        <strong>たびたび</strong>
        <small>旅のしおり</small>
      </span>
    </a>

    <nav aria-label="メインナビゲーション">
      <a class:active={active === "explore"} href="/explore">みんなのしおり</a>
      <a class="desktop-link" href="/profile">マイページ</a>
      <a class="create-link" class:active={active === "create"} href="/#create">
        <span aria-hidden="true">＋</span> しおりを作る
      </a>
    </nav>
  </div>
</header>

<style>
  .public-header {
    position: relative;
    z-index: 30;
    border-bottom: 1px solid rgba(28, 56, 58, 0.1);
    background: rgba(255, 253, 248, 0.92);
    backdrop-filter: blur(14px);
  }

  .header-inner {
    width: min(1180px, calc(100% - 40px));
    height: 76px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
  }

  .brand {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    color: #173f42;
    text-decoration: none;
  }

  .brand-mark {
    display: grid;
    width: 38px;
    height: 38px;
    place-items: center;
    border-radius: 12px 12px 12px 3px;
    color: white;
    background: #ed6a5a;
    box-shadow: 0 5px 14px rgba(237, 106, 90, 0.22);
    font-size: 19px;
    font-weight: 900;
  }

  .brand-copy {
    display: flex;
    flex-direction: column;
    line-height: 1;
  }

  .brand-copy strong {
    font-family: "Hiragino Maru Gothic ProN", "Yu Gothic", sans-serif;
    font-size: 18px;
    font-weight: 900;
    letter-spacing: 0.04em;
  }

  .brand-copy small {
    margin-top: 5px;
    color: #779092;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.22em;
  }

  nav {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  nav a {
    padding: 10px 14px;
    border-radius: 999px;
    color: #52696a;
    text-decoration: none;
    font-size: 13px;
    font-weight: 700;
    transition: 160ms ease;
  }

  nav a:hover,
  nav a.active {
    color: #173f42;
    background: #edf4ef;
  }

  nav .create-link {
    margin-left: 8px;
    padding: 11px 18px;
    color: white;
    background: #173f42;
    box-shadow: 0 7px 18px rgba(23, 63, 66, 0.16);
  }

  nav .create-link:hover,
  nav .create-link.active {
    color: white;
    background: #24575a;
    transform: translateY(-1px);
  }

  @media (max-width: 680px) {
    .header-inner {
      width: min(100% - 28px, 1180px);
      height: 66px;
    }

    .brand-copy small,
    .desktop-link {
      display: none;
    }

    nav {
      gap: 2px;
    }

    nav a {
      padding: 9px 8px;
      font-size: 11px;
    }

    nav .create-link {
      margin-left: 2px;
      padding: 10px 12px;
    }
  }
</style>
