<footer>
  <div class="inner">
    <a class="brand" href="/">✈ たびたび</a>
    <nav aria-label="フッターナビゲーション">
      <a href="/explore">みんなのしおり</a>
      <a href="/#create">しおりを作る</a>
      <a href="/docs/index">使い方</a>
    </nav>
    <small>© 2026 tabitabi</small>
  </div>
</footer>

<style>
  footer {
    padding: 42px 20px;
    border-top: 1px solid #e7ecf6;
    color: #64748b;
    background: white;
  }

  .inner {
    display: flex;
    width: min(1080px, 100%);
    margin: 0 auto;
    align-items: center;
    gap: 28px;
  }

  .brand {
    color: #315da8;
    text-decoration: none;
    font-size: 16px;
    font-weight: 900;
  }

  nav {
    display: flex;
    flex: 1;
    flex-wrap: wrap;
    gap: 18px;
  }

  nav a {
    color: inherit;
    text-decoration: none;
    font-size: 12px;
    font-weight: 700;
  }

  nav a:hover { color: #315da8; }
  small { font-size: 10px; }

  @media (max-width: 600px) {
    .inner {
      flex-direction: column;
      align-items: flex-start;
      gap: 18px;
    }

    nav { gap: 14px; }
  }
</style>
