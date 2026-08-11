<script lang="ts">
  import { page } from "$app/stores";
  import { prefectures, regions } from "$lib/explore/data";

  type Visibility = "private" | "unlisted" | "public";

  let visibility = $state<Visibility>("private");
  let modalOpen = $state(false);
  let selectedPrefectures = $state<string[]>([]);
  let destinationQuery = $state("");
  let showCopiedBanner = $derived($page.url.searchParams.get("copied") === "1");
  let saved = $state(false);
  let published = $state(false);
  let saving = $state(false);
  let title = $state("朝と余白を味わう、2泊3日の京都（コピー）");
  let savedTitle = $state("朝と余白を味わう、2泊3日の京都（コピー）");

  const visibilityLabel = $derived(
    published && visibility === "public"
      ? "みんなに公開中"
      : visibility === "private"
        ? "非公開"
        : visibility === "unlisted"
          ? "URL限定公開"
          : "公開準備中",
  );

  const filteredPrefectures = $derived(
    destinationQuery.trim()
      ? prefectures.filter((prefecture) => prefecture.name.includes(destinationQuery.trim()))
      : prefectures,
  );

  const canSaveVisibility = $derived(
    visibility !== "public" || selectedPrefectures.length > 0,
  );

  function togglePrefecture(slug: string) {
    selectedPrefectures = selectedPrefectures.includes(slug)
      ? selectedPrefectures.filter((item) => item !== slug)
      : [...selectedPrefectures, slug];
  }

  function openVisibility() {
    modalOpen = true;
    document.body.style.overflow = "hidden";
  }

  function closeVisibility() {
    modalOpen = false;
    document.body.style.overflow = "";
  }

  async function saveVisibility() {
    if (!canSaveVisibility) return;
    saving = true;
    await new Promise((resolve) => setTimeout(resolve, 450));
    published = visibility === "public";
    saving = false;
    saved = true;
    closeVisibility();
    setTimeout(() => (saved = false), 2800);
  }

  function saveTitle() {
    savedTitle = title.trim() || savedTitle;
    title = savedTitle;
    saved = true;
    setTimeout(() => (saved = false), 1800);
  }
</script>

<svelte:head>
  <title>{savedTitle}を編集 - たびたび</title>
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="editor-page">
  <header class="editor-header">
    <div class="header-left">
      <a class="brand" href="/" aria-label="たびたびホーム"><span>た</span><strong>たびたび</strong></a>
      <i aria-hidden="true"></i>
      <div class="document-name"><span>しおりを編集中</span><strong>{savedTitle}</strong></div>
    </div>
    <div class="header-actions">
      <span class="save-state">{saved ? "✓ 保存しました" : "自動保存"}</span>
      <a class="preview" href="/itineraries/kyoto-weekend" target="_blank"><span aria-hidden="true">◉</span> プレビュー</a>
      <button class:published onclick={openVisibility}><span class="status-dot"></span>{visibilityLabel}<b>⌄</b></button>
    </div>
  </header>

  <div class="editor-shell">
    <aside class="editor-sidebar" aria-label="しおり編集メニュー">
      <p>EDIT MENU</p>
      <nav>
        <button class="active"><span>▤</span><b>基本情報</b></button>
        <button><span>⌚</span><b>旅程</b><em>12</em></button>
        <button><span>≡</span><b>メモ</b></button>
        <button><span>◇</span><b>テーマ</b></button>
        <button onclick={openVisibility}><span>↗</span><b>公開設定</b></button>
      </nav>
      <div class="sidebar-help">
        <span aria-hidden="true">?</span>
        <p>使い方で困ったら</p>
        <a href="/docs/index">ヘルプを見る</a>
      </div>
    </aside>

    <main class="editor-main">
      {#if showCopiedBanner}
        <div class="copied-banner">
          <div class="banner-icon" aria-hidden="true">✓</div>
          <div><strong>しおりをコピーしました</strong><p>元のしおりとは別の、あなただけの非公開しおりです。日程や予定を自由に変えられます。</p></div>
          <a href="/itineraries/kyoto-weekend">コピー元を見る ↗</a>
        </div>
      {/if}

      <section class="edit-heading">
        <div>
          <p>ITINERARY EDITOR</p>
          <h1>しおりを編集</h1>
          <span>旅に合わせて、タイトルや旅程を整えましょう。</span>
        </div>
        <span class="heading-stamp" aria-hidden="true">編</span>
      </section>

      <div class="editor-grid">
        <div class="edit-content">
          <section class="form-card basic-card">
            <div class="card-heading">
              <span class="card-number">01</span>
              <div><h2>基本情報</h2><p>旅のタイトルと日程</p></div>
            </div>
            <div class="form-field">
              <label for="title">しおりのタイトル</label>
              <div class="title-input-row">
                <input id="title" bind:value={title} maxlength="100" onblur={saveTitle} />
                <span>{title.length}/100</span>
              </div>
            </div>
            <div class="date-grid">
              <div class="form-field"><label for="start-date">出発日</label><input id="start-date" type="date" value="2026-09-19" /></div>
              <span class="date-arrow" aria-hidden="true">→</span>
              <div class="form-field"><label for="end-date">帰着日</label><input id="end-date" type="date" value="2026-09-21" /></div>
            </div>
          </section>

          <section class="form-card schedule-card">
            <div class="card-heading schedule-heading">
              <div class="heading-left"><span class="card-number">02</span><div><h2>旅程</h2><p>3日間 · 12の予定</p></div></div>
              <button><span>＋</span> 予定を追加</button>
            </div>

            <div class="day-editor">
              <div class="day-label"><span>DAY 1</span><strong>9月19日（土）</strong></div>
              <div class="editor-steps">
                <button><time>08:10</time><i class="move"></i><strong>京都駅に到着</strong><span>JR京都駅</span><b>⋮</b></button>
                <button><time>09:00</time><i></i><strong>無鄰菴の庭を歩く</strong><span>無鄰菴</span><b>⋮</b></button>
                <button><time>11:00</time><i class="food"></i><strong>岡崎の喫茶店で早めの昼食</strong><span>岡崎エリア</span><b>⋮</b></button>
                <button class="more"><span>＋2件の予定を表示</span></button>
              </div>
            </div>
            <div class="day-editor collapsed"><div class="day-label"><span>DAY 2</span><strong>9月20日（日）</strong></div><button class="open-day">5件の予定 <span>⌄</span></button></div>
            <div class="day-editor collapsed"><div class="day-label"><span>DAY 3</span><strong>9月21日（月）</strong></div><button class="open-day">4件の予定 <span>⌄</span></button></div>
          </section>
        </div>

        <aside class="editor-aside">
          <section class="publish-card" class:public={published}>
            <div class="publish-icon" aria-hidden="true">{published ? "✓" : "↗"}</div>
            <p>PUBLIC SETTINGS</p>
            <h2>{published ? "みんなに公開中" : "旅が完成したら公開しよう"}</h2>
            <span>{published ? "京都府・大阪府のページに掲載されています。" : "公開すると、次の旅を探している人に見つけてもらえます。"}</span>
            {#if published}
              <div class="published-areas">
                {#each selectedPrefectures as slug}
                  <a href="/area/{slug}">{prefectures.find((item) => item.slug === slug)?.name} ↗</a>
                {/each}
              </div>
            {/if}
            <button onclick={openVisibility}>{published ? "公開設定を変更" : "公開設定をひらく"}<b>→</b></button>
          </section>

          <section class="quality-card">
            <p>公開しおりの完成度</p>
            <div class="quality-score"><strong>88</strong><span>/ 100</span></div>
            <div class="quality-bar"><i></i></div>
            <ul>
              <li class="done">✓ タイトル</li>
              <li class="done">✓ 旅程が3件以上</li>
              <li class:done={selectedPrefectures.length > 0}>{selectedPrefectures.length > 0 ? "✓" : "○"} 旅行先</li>
            </ul>
          </section>

          <section class="source-card">
            <span aria-hidden="true">⎘</span>
            <div><p>コピー元のしおり</p><a href="/itineraries/kyoto-weekend">朝と余白を味わう、2泊3日の京都 ↗</a></div>
          </section>
        </aside>
      </div>
    </main>
  </div>
</div>

{#if modalOpen}
  <div
    class="modal-backdrop"
    role="presentation"
    onclick={(event) => event.target === event.currentTarget && closeVisibility()}
  >
    <div class="visibility-modal" role="dialog" aria-modal="true" aria-labelledby="visibility-title">
      <header class="modal-header">
        <div><p>VISIBILITY SETTINGS</p><h2 id="visibility-title">このしおりの公開設定</h2><span>公開範囲はいつでも変更できます。</span></div>
        <button onclick={closeVisibility} aria-label="閉じる">×</button>
      </header>

      <div class="modal-content">
        <fieldset class="visibility-options">
          <legend>公開範囲</legend>
          <label class:selected={visibility === "private"}>
            <input type="radio" name="visibility" value="private" bind:group={visibility} />
            <span class="option-icon lock" aria-hidden="true">●</span>
            <div><strong>非公開</strong><p>自分だけが閲覧できます</p></div>
            <i aria-hidden="true"></i>
          </label>
          <label class:selected={visibility === "unlisted"}>
            <input type="radio" name="visibility" value="unlisted" bind:group={visibility} />
            <span class="option-icon link" aria-hidden="true">⌁</span>
            <div><strong>URL限定公開</strong><p>URLを知っている人だけ閲覧できます</p></div>
            <i aria-hidden="true"></i>
          </label>
          <label class:selected={visibility === "public"}>
            <input type="radio" name="visibility" value="public" bind:group={visibility} />
            <span class="option-icon public" aria-hidden="true">✦</span>
            <div><strong>みんなに公開</strong><p>Exploreや旅行先ページに掲載されます</p><em>おすすめ</em></div>
            <i aria-hidden="true"></i>
          </label>
        </fieldset>

        {#if visibility === "public"}
          <section class="destination-picker">
            <div class="picker-heading">
              <div><span>必須</span><h3>この旅行の旅行先</h3></div>
              <small>{selectedPrefectures.length}件選択中</small>
            </div>
            <p>都道府県ページに掲載するため、1件以上選んでください。複数選択できます。</p>

            {#if selectedPrefectures.length > 0}
              <div class="selected-list">
                {#each selectedPrefectures as slug}
                  {@const prefecture = prefectures.find((item) => item.slug === slug)}
                  {#if prefecture}<button onclick={() => togglePrefecture(slug)}>{prefecture.name}<span>×</span></button>{/if}
                {/each}
              </div>
            {/if}

            <div class="prefecture-search"><span aria-hidden="true">⌕</span><input aria-label="都道府県を検索" placeholder="都道府県を検索" bind:value={destinationQuery} /></div>
            <div class="prefecture-list">
              {#each regions as region}
                {#if filteredPrefectures.some((prefecture) => prefecture.region === region)}
                  <div class="region-group">
                    <h4>{region}</h4>
                    <div>
                      {#each filteredPrefectures.filter((prefecture) => prefecture.region === region) as prefecture}
                        <button class:selected={selectedPrefectures.includes(prefecture.slug)} onclick={() => togglePrefecture(prefecture.slug)}>
                          <span class="check">{selectedPrefectures.includes(prefecture.slug) ? "✓" : ""}</span>{prefecture.name}
                        </button>
                      {/each}
                    </div>
                  </div>
                {/if}
              {/each}
            </div>
            {#if selectedPrefectures.length === 0}<p class="validation">旅行先を1件以上選択してください</p>{/if}
          </section>
        {/if}
      </div>

      <footer class="modal-footer">
        <div>
          {#if visibility === "public"}<span class="index-note">検索エンジンへの掲載は内容の充実度をもとに判定されます</span>{/if}
        </div>
        <button class="cancel" onclick={closeVisibility}>キャンセル</button>
        <button class="save" onclick={saveVisibility} disabled={!canSaveVisibility || saving}>{saving ? "保存中…" : visibility === "public" ? "設定して公開" : "設定を保存"}</button>
      </footer>
    </div>
  </div>
{/if}

{#if saved}<div class="toast" role="status"><span>✓</span>{published ? "公開設定を保存しました" : "変更を保存しました"}</div>{/if}

<style>
  :global(body) { background: #f4f5f1; }
  .editor-page { min-height: 100vh; color: #29494a; background: #f4f5f1; font-family: "Hiragino Kaku Gothic ProN", "Yu Gothic", "Meiryo", sans-serif; }
  .editor-header { position: sticky; z-index: 30; top: 0; display: flex; height: 68px; align-items: center; justify-content: space-between; gap: 20px; padding: 0 24px; border-bottom: 1px solid #dfe3dd; background: rgba(255,255,252,.96); backdrop-filter: blur(12px); }
  .header-left, .header-actions, .brand, .document-name { display: flex; align-items: center; }
  .header-left { gap: 18px; min-width: 0; }
  .brand { gap: 8px; color: #173f42; text-decoration: none; }
  .brand > span { display: grid; width: 32px; height: 32px; place-items: center; border-radius: 10px 10px 10px 3px; color: white; background: #e16a59; font-weight: 900; }
  .brand strong { font-size: 15px; font-weight: 900; }
  .header-left > i { width: 1px; height: 30px; background: #e0e3dd; }
  .document-name { min-width: 0; align-items: flex-start; flex-direction: column; gap: 3px; }
  .document-name span { color: #98a3a0; font-size: 7px; font-weight: 800; letter-spacing: .1em; }
  .document-name strong { overflow: hidden; max-width: 330px; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
  .header-actions { gap: 9px; }
  .save-state { margin-right: 5px; color: #92a09d; font-size: 8px; }
  .preview { padding: 9px 12px; border-radius: 8px; color: #486665; background: #eef2ed; text-decoration: none; font-size: 9px; font-weight: 800; }
  .header-actions button { display: flex; align-items: center; gap: 7px; padding: 10px 13px; border: 0; border-radius: 8px; color: white; background: #173f42; font-size: 9px; font-weight: 800; cursor: pointer; }
  .header-actions button.published { background: #e16656; }
  .status-dot { width: 6px; height: 6px; border-radius: 50%; background: #b8d0c8; box-shadow: 0 0 0 3px rgba(255,255,255,.12); }
  .editor-shell { display: grid; grid-template-columns: 190px minmax(0, 1fr); }
  .editor-sidebar { position: sticky; top: 68px; display: flex; height: calc(100vh - 68px); box-sizing: border-box; flex-direction: column; padding: 28px 15px 20px; border-right: 1px solid #dde2dc; background: #fffdf9; }
  .editor-sidebar > p { margin: 0 12px 13px; color: #a4aeab; font-size: 7px; font-weight: 900; letter-spacing: .17em; }
  .editor-sidebar nav { display: flex; flex-direction: column; gap: 4px; }
  .editor-sidebar nav button { display: grid; grid-template-columns: 28px 1fr auto; align-items: center; padding: 10px; border: 0; border-radius: 9px; color: #637977; background: transparent; text-align: left; cursor: pointer; }
  .editor-sidebar nav button:hover, .editor-sidebar nav button.active { color: #1f4a4b; background: #edf3ee; }
  .editor-sidebar nav button > span { display: grid; width: 25px; height: 25px; place-items: center; border-radius: 7px; color: #6c8581; background: #f0f3ee; font-size: 11px; }
  .editor-sidebar nav button.active > span { color: white; background: #2c5a59; }
  .editor-sidebar nav b { font-size: 10px; }
  .editor-sidebar nav em { display: grid; width: 19px; height: 19px; place-items: center; border-radius: 50%; color: #8b9996; background: #e7ece6; font-size: 7px; font-style: normal; }
  .sidebar-help { margin-top: auto; padding: 14px; border-radius: 10px; background: #f3f5ef; }
  .sidebar-help > span { display: grid; width: 22px; height: 22px; place-items: center; border: 1px solid #a8b8b4; border-radius: 50%; color: #6d8582; font-size: 9px; }
  .sidebar-help p { margin: 9px 0 4px; color: #71817f; font-size: 8px; }
  .sidebar-help a { color: #315958; font-size: 8px; font-weight: 800; }
  .editor-main { min-width: 0; padding: 38px 38px 90px; }
  .copied-banner { display: flex; width: min(960px, 100%); box-sizing: border-box; align-items: center; gap: 13px; margin: 0 auto 28px; padding: 15px 17px; border: 1px solid #b9d4c9; border-radius: 12px; color: #2e5d57; background: #edf7f1; }
  .banner-icon { display: grid; flex: none; width: 32px; height: 32px; place-items: center; border-radius: 50%; color: white; background: #4f8b78; font-size: 12px; }
  .copied-banner strong { font-size: 10px; }
  .copied-banner p { margin: 3px 0 0; color: #6b827d; font-size: 8px; }
  .copied-banner a { margin-left: auto; color: #3f7066; font-size: 8px; font-weight: 800; white-space: nowrap; }
  .edit-heading { display: flex; width: min(960px, 100%); align-items: flex-end; justify-content: space-between; margin: 0 auto 27px; }
  .edit-heading p { margin: 0 0 7px; color: #d36153; font-size: 7px; font-weight: 900; letter-spacing: .17em; }
  .edit-heading h1 { margin: 0; color: #21494a; font-family: "Yu Mincho", serif; font-size: 30px; }
  .edit-heading > div > span { display: block; margin-top: 6px; color: #83928f; font-size: 9px; }
  .heading-stamp { display: grid; width: 42px; height: 42px; place-items: center; border: 1px solid #d17b6d; border-radius: 50%; color: #d16355; font-family: serif; font-size: 15px; }
  .editor-grid { display: grid; grid-template-columns: minmax(0, 1fr) 245px; gap: 20px; width: min(960px, 100%); margin: 0 auto; }
  .edit-content, .editor-aside { min-width: 0; }
  .form-card, .editor-aside > section { margin-bottom: 17px; border: 1px solid #dfe4dd; border-radius: 16px; background: #fffefa; box-shadow: 0 8px 25px rgba(45,70,65,.04); }
  .form-card { padding: 23px; }
  .card-heading, .heading-left { display: flex; align-items: center; gap: 12px; }
  .card-number { display: grid; width: 37px; height: 37px; place-items: center; border-radius: 10px 10px 10px 3px; color: white; background: #2a5555; font-family: Georgia, serif; font-size: 11px; }
  .card-heading h2 { margin: 0; color: #315455; font-size: 13px; }
  .card-heading p { margin: 3px 0 0; color: #98a39f; font-size: 8px; }
  .form-field { margin-top: 22px; }
  .form-field label { display: block; margin-bottom: 6px; color: #657a77; font-size: 8px; font-weight: 800; }
  .form-field input { width: 100%; height: 42px; box-sizing: border-box; padding: 0 12px; border: 1px solid #dce2dc; border-radius: 9px; color: #315152; background: #fbfcf8; font-size: 11px; font-weight: 700; }
  .form-field input:focus { border-color: #6f9990; outline: 2px solid rgba(81,139,126,.14); }
  .title-input-row { position: relative; }
  .title-input-row input { padding-right: 56px; }
  .title-input-row span { position: absolute; right: 10px; top: 50%; color: #a4aeaa; font-size: 7px; transform: translateY(-50%); }
  .date-grid { display: grid; grid-template-columns: 1fr 30px 1fr; align-items: end; gap: 8px; }
  .date-arrow { display: grid; height: 42px; place-items: center; color: #9aa6a2; font-size: 12px; }
  .schedule-heading { justify-content: space-between; }
  .schedule-heading > button { padding: 9px 12px; border: 0; border-radius: 8px; color: white; background: #df6757; font-size: 8px; font-weight: 800; cursor: pointer; }
  .day-editor { margin-top: 22px; padding-top: 18px; border-top: 1px solid #ebede8; }
  .day-label { display: flex; align-items: center; gap: 10px; }
  .day-label span { padding: 5px 7px; border-radius: 6px; color: white; background: #2b5555; font-size: 7px; font-weight: 900; }
  .day-label strong { color: #476665; font-size: 10px; }
  .editor-steps { margin-top: 11px; border: 1px solid #e6e9e3; border-radius: 10px; }
  .editor-steps > button { display: grid; width: 100%; grid-template-columns: 42px 10px minmax(120px, 1fr) minmax(90px, .55fr) 20px; align-items: center; gap: 8px; padding: 11px 12px; border: 0; border-bottom: 1px solid #eef0eb; color: #365858; background: white; text-align: left; cursor: pointer; }
  .editor-steps > button:first-child { border-radius: 10px 10px 0 0; }
  .editor-steps > button:hover { background: #f8faf6; }
  .editor-steps time { font-family: Georgia, serif; font-size: 9px; }
  .editor-steps i { width: 6px; height: 6px; border-radius: 50%; background: #558b7d; }
  .editor-steps i.move { background: #778fa5; }
  .editor-steps i.food { background: #df6b5b; }
  .editor-steps strong { overflow: hidden; font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }
  .editor-steps > button > span { overflow: hidden; color: #8a9996; font-size: 8px; text-overflow: ellipsis; white-space: nowrap; }
  .editor-steps b { color: #a5aeab; font-size: 14px; }
  .editor-steps > button.more { display: block; padding: 10px; border: 0; border-radius: 0 0 10px 10px; color: #65807c; background: #f8faf6; text-align: center; }
  .day-editor.collapsed { display: flex; align-items: center; justify-content: space-between; }
  .open-day { padding: 7px 9px; border: 0; border-radius: 7px; color: #708580; background: #f0f3ee; font-size: 8px; font-weight: 700; }
  .editor-aside > section { padding: 19px; }
  .publish-card { color: white; background: #183f42 !important; }
  .publish-card.public { background: #4d806f !important; }
  .publish-icon { display: grid; width: 36px; height: 36px; place-items: center; border: 1px solid rgba(255,255,255,.3); border-radius: 50%; font-size: 15px; }
  .publish-card > p { margin: 17px 0 6px; color: #8eafab; font-size: 7px; font-weight: 900; letter-spacing: .15em; }
  .publish-card h2 { margin: 0 0 10px; color: white; font-family: "Yu Mincho", serif; font-size: 16px; line-height: 1.5; }
  .publish-card > span { color: #b8ccca; font-size: 9px; line-height: 1.7; }
  .publish-card > button { display: flex; width: 100%; justify-content: space-between; margin-top: 18px; padding: 10px 12px; border: 0; border-radius: 8px; color: #214b4c; background: white; font-size: 8px; font-weight: 900; cursor: pointer; }
  .published-areas { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 11px; }
  .published-areas a { padding: 5px 7px; border-radius: 999px; color: white; background: rgba(255,255,255,.14); text-decoration: none; font-size: 7px; }
  .quality-card > p { margin: 0; color: #70817e; font-size: 9px; font-weight: 800; }
  .quality-score { display: flex; align-items: baseline; margin-top: 11px; }
  .quality-score strong { color: #315657; font-family: Georgia, serif; font-size: 31px; font-weight: 400; }
  .quality-score span { color: #a0aaa7; font-size: 8px; }
  .quality-bar { height: 4px; margin: 7px 0 14px; border-radius: 4px; background: #e8ece6; }
  .quality-bar i { display: block; width: 88%; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #dfa348, #df6757); }
  .quality-card ul { display: grid; gap: 7px; margin: 0; padding: 0; color: #9aa4a1; list-style: none; font-size: 8px; }
  .quality-card li.done { color: #4d7e70; }
  .source-card { display: flex; gap: 10px; background: #f8f6ed !important; }
  .source-card > span { display: grid; flex: none; width: 28px; height: 28px; place-items: center; border-radius: 8px; color: #d06455; background: #ffebe1; }
  .source-card p { margin: 1px 0 4px; color: #94a09c; font-size: 7px; }
  .source-card a { display: block; color: #486766; font-size: 8px; font-weight: 800; line-height: 1.5; }
  .modal-backdrop { position: fixed; z-index: 100; inset: 0; display: grid; place-items: center; padding: 20px; background: rgba(19,47,49,.6); backdrop-filter: blur(7px); }
  .visibility-modal { display: flex; width: min(650px, 100%); max-height: calc(100vh - 40px); flex-direction: column; overflow: hidden; border-radius: 21px; background: #fffdfa; box-shadow: 0 30px 80px rgba(18,42,42,.32); }
  .modal-header { display: flex; justify-content: space-between; gap: 20px; padding: 24px 26px 19px; border-bottom: 1px solid #e6e8e2; }
  .modal-header p { margin: 0 0 5px; color: #d26052; font-size: 7px; font-weight: 900; letter-spacing: .16em; }
  .modal-header h2 { margin: 0; color: #214849; font-family: "Yu Mincho", serif; font-size: 21px; }
  .modal-header span { display: block; margin-top: 5px; color: #8d9996; font-size: 8px; }
  .modal-header button { display: grid; width: 32px; height: 32px; place-items: center; border: 0; border-radius: 50%; color: #647b78; background: #eef1ec; font-size: 18px; cursor: pointer; }
  .modal-content { overflow-y: auto; padding: 20px 26px 23px; }
  .visibility-options { display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; margin: 0; padding: 0; border: 0; }
  .visibility-options legend { grid-column: 1/-1; margin-bottom: 7px; color: #667b78; font-size: 8px; font-weight: 800; }
  .visibility-options label { position: relative; display: flex; min-height: 117px; box-sizing: border-box; flex-direction: column; align-items: flex-start; padding: 14px; border: 1px solid #dde2dc; border-radius: 12px; background: white; cursor: pointer; }
  .visibility-options label.selected { border-color: #396c66; box-shadow: inset 0 0 0 1px #396c66; }
  .visibility-options input { position: absolute; opacity: 0; }
  .option-icon { display: grid; width: 29px; height: 29px; place-items: center; border-radius: 8px; color: #587471; background: #edf2ee; font-size: 9px; }
  .option-icon.public { color: #c75447; background: #fff0e7; }
  .visibility-options strong { display: block; margin-top: 10px; color: #315354; font-size: 10px; }
  .visibility-options p { margin: 4px 0 0; color: #899795; font-size: 7px; line-height: 1.5; }
  .visibility-options em { position: absolute; right: 10px; top: 11px; padding: 3px 5px; border-radius: 999px; color: #c65446; background: #fff0e8; font-size: 6px; font-style: normal; font-weight: 800; }
  .visibility-options label > i { position: absolute; right: 12px; bottom: 12px; width: 12px; height: 12px; border: 1px solid #bdc8c4; border-radius: 50%; }
  .visibility-options label.selected > i { border: 4px solid #356761; }
  .destination-picker { margin-top: 19px; padding-top: 19px; border-top: 1px solid #e5e8e1; }
  .picker-heading { display: flex; align-items: center; justify-content: space-between; }
  .picker-heading > div { display: flex; align-items: center; gap: 8px; }
  .picker-heading > div > span { padding: 3px 5px; border-radius: 4px; color: white; background: #df6757; font-size: 6px; font-weight: 900; }
  .picker-heading h3 { margin: 0; color: #345657; font-size: 11px; }
  .picker-heading small { color: #d06153; font-size: 8px; font-weight: 800; }
  .destination-picker > p { margin: 7px 0 12px; color: #879491; font-size: 8px; }
  .selected-list { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
  .selected-list button { padding: 6px 8px; border: 0; border-radius: 999px; color: white; background: #32645f; font-size: 8px; font-weight: 800; cursor: pointer; }
  .selected-list span { margin-left: 5px; opacity: .7; }
  .prefecture-search { position: relative; }
  .prefecture-search > span { position: absolute; left: 11px; top: 50%; color: #80928e; transform: translateY(-50%); }
  .prefecture-search input { width: 100%; height: 38px; box-sizing: border-box; padding: 0 12px 0 31px; border: 1px solid #dce2dc; border-radius: 8px; color: #3d5e5d; background: white; font-size: 9px; }
  .prefecture-list { max-height: 210px; overflow-y: auto; margin-top: 10px; padding: 7px; border: 1px solid #e1e5df; border-radius: 10px; background: #f8faf6; }
  .region-group { display: grid; grid-template-columns: 72px 1fr; gap: 8px; padding: 8px; border-bottom: 1px solid #e6eae4; }
  .region-group:last-child { border-bottom: 0; }
  .region-group h4 { margin: 7px 0 0; color: #6f8480; font-size: 8px; }
  .region-group > div { display: flex; flex-wrap: wrap; gap: 5px; }
  .region-group button { display: inline-flex; align-items: center; gap: 5px; padding: 6px 7px; border: 1px solid #dce2dc; border-radius: 6px; color: #526e6c; background: white; font-size: 8px; cursor: pointer; }
  .region-group button.selected { border-color: #4d8378; color: #2e625a; background: #e8f3ed; font-weight: 800; }
  .check { display: grid; width: 10px; height: 10px; place-items: center; border: 1px solid #b9c7c2; border-radius: 3px; font-size: 7px; }
  .selected .check { border-color: #4c8277; color: white; background: #4c8277; }
  .validation { color: #d3584c !important; font-weight: 800; }
  .modal-footer { display: flex; align-items: center; gap: 8px; padding: 15px 26px; border-top: 1px solid #e2e6df; background: #f7f8f4; }
  .modal-footer > div { flex: 1; }
  .index-note { color: #8c9996; font-size: 7px; }
  .modal-footer button { padding: 10px 14px; border-radius: 8px; font-size: 8px; font-weight: 900; cursor: pointer; }
  .modal-footer .cancel { border: 1px solid #d7ddd7; color: #687c79; background: white; }
  .modal-footer .save { border: 0; color: white; background: #e06757; }
  .modal-footer .save:disabled { color: #9aa8a4; background: #dfe5df; cursor: not-allowed; }
  .toast { position: fixed; z-index: 120; left: 50%; bottom: 24px; display: flex; align-items: center; gap: 8px; padding: 12px 17px; border-radius: 999px; color: white; background: #214b4b; box-shadow: 0 10px 30px rgba(30,63,62,.25); font-size: 9px; font-weight: 800; transform: translateX(-50%); }
  .toast span { display: grid; width: 19px; height: 19px; place-items: center; border-radius: 50%; color: #214b4b; background: #aedaaf; }
  @media (max-width: 950px) { .editor-grid { grid-template-columns: 1fr; } .editor-aside { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; } .editor-aside > section { margin: 0; } }
  @media (max-width: 720px) { .editor-header { padding: 0 12px; } .header-left > i, .document-name, .save-state, .preview { display: none; } .editor-shell { grid-template-columns: 1fr; } .editor-sidebar { position: fixed; z-index: 25; right: 0; bottom: 0; left: 0; top: auto; height: 58px; padding: 5px 8px; border: 0; border-top: 1px solid #dde2dc; } .editor-sidebar > p, .sidebar-help { display: none; } .editor-sidebar nav { display: grid; grid-template-columns: repeat(5, 1fr); gap: 3px; } .editor-sidebar nav button { display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 2px; padding: 4px; text-align: center; } .editor-sidebar nav button > span { width: 24px; height: 24px; } .editor-sidebar nav b { font-size: 7px; } .editor-sidebar nav em { display: none; } .editor-main { padding: 25px 13px 85px; } .copied-banner { align-items: flex-start; } .copied-banner a { display: none; } .editor-grid { display: block; } .editor-aside { grid-template-columns: 1fr; margin-top: 17px; } .date-grid { grid-template-columns: 1fr; } .date-arrow { display: none; } .editor-steps > button { grid-template-columns: 38px 8px minmax(0, 1fr) 16px; } .editor-steps > button > span { display: none; } .visibility-options { grid-template-columns: 1fr; } .visibility-options label { min-height: 75px; display: grid; grid-template-columns: 35px 1fr; align-items: center; } .visibility-options strong { margin-top: 0; } .modal-footer > div { display: none; } .modal-footer { justify-content: flex-end; } .modal-content { padding-right: 17px; padding-left: 17px; } .modal-header { padding-right: 17px; padding-left: 17px; } }
</style>
