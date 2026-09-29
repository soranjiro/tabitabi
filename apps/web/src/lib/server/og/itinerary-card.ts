const CARD_WIDTH = 1200;
const CARD_HEIGHT = 630;
const CONTENT_X = 72;
const CONTENT_WIDTH = 1056;

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function glyphUnits(character: string): number {
  if (/\s/.test(character)) return 0.34;
  return /^[\u0000-\u00ff]$/.test(character) ? 0.58 : 1;
}

function textUnits(value: string): number {
  return Array.from(value).reduce((sum, character) => sum + glyphUnits(character), 0);
}

function trimToUnits(value: string, maxUnits: number): string {
  const characters = Array.from(value);
  let width = 0;
  let result = "";
  for (const character of characters) {
    const next = width + glyphUnits(character);
    if (next > maxUnits) break;
    result += character;
    width = next;
  }
  return result.trim();
}

export interface OgTitleLayout {
  fontSize: number;
  lines: string[];
}

export function layoutOgTitle(title: string): OgTitleLayout {
  const normalized = title.trim() || "旅のしおり";
  const totalUnits = textUnits(normalized);
  const fontSize = totalUnits > 34 ? 52 : totalUnits > 27 ? 58 : 64;
  const maxUnits = CONTENT_WIDTH / fontSize;
  const characters = Array.from(normalized);
  const lines: string[] = [];
  let current = "";
  let width = 0;

  for (const character of characters) {
    const charWidth = glyphUnits(character);
    if (current && width + charWidth > maxUnits) {
      lines.push(current.trim());
      current = "";
      width = 0;
      if (lines.length === 2) break;
    }
    current += character;
    width += charWidth;
  }

  if (lines.length < 2 && current.trim()) lines.push(current.trim());

  const consumed = lines.join("").replaceAll(/\s/g, "").length;
  const sourceLength = normalized.replaceAll(/\s/g, "").length;
  if (sourceLength > consumed && lines.length) {
    const lastIndex = lines.length - 1;
    lines[lastIndex] = `${trimToUnits(lines[lastIndex], Math.max(1, maxUnits - 1))}…`;
  }

  return { fontSize, lines: lines.slice(0, 2) };
}

export async function loadOgFontBuffers(text: string): Promise<Uint8Array[]> {
  const uniqueText = Array.from(new Set(Array.from(`${text}たびたび`))).join("");
  const cssUrl = new URL("https://fonts.googleapis.com/css2");
  cssUrl.searchParams.set("family", "Noto Sans JP:wght@700");
  cssUrl.searchParams.set("display", "swap");
  cssUrl.searchParams.set("text", uniqueText);

  const cssResponse = await fetch(cssUrl, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36",
    },
  });
  if (!cssResponse.ok) throw new Error(`OG font stylesheet fetch failed: ${cssResponse.status}`);

  const css = await cssResponse.text();
  const urls = [...new Set([...css.matchAll(/url\(([^)]+)\)/g)].map((match) => match[1].replaceAll(/['"]/g, "")))];
  if (!urls.length) throw new Error("OG font stylesheet did not contain font URLs");

  const buffers = await Promise.all(
    urls.map(async (url) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`OG font fetch failed: ${response.status}`);
      return new Uint8Array(await response.arrayBuffer());
    }),
  );
  return buffers;
}

export function createItineraryOgSvg(input: {
  backgroundDataUri: string;
  iconDataUri: string;
  title: string;
  dateLabel: string;
}): string {
  const { fontSize, lines } = layoutOgTitle(input.title);
  const dateY = lines.length > 1 ? 414 : 448;
  const titleStartY = lines.length > 1 ? 486 : 526;
  const lineHeight = Math.round(fontSize * 1.24);
  const brand = "たびたび";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}">
  <defs>
    <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#07110f" stop-opacity="0.10"/>
      <stop offset="42%" stop-color="#07110f" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#07110f" stop-opacity="0.86"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.28"/>
    </filter>
  </defs>
  <image href="${input.backgroundDataUri}" x="0" y="0" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" preserveAspectRatio="xMidYMid slice"/>
  <rect x="0" y="0" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="url(#shade)"/>
  <g transform="translate(${CONTENT_X} 62)" filter="url(#shadow)">
    <rect x="-14" y="-12" width="210" height="72" rx="24" fill="#081310" fill-opacity="0.42"/>
    <image href="${input.iconDataUri}" x="0" y="0" width="48" height="48" preserveAspectRatio="xMidYMid meet"/>
    <text x="62" y="35" fill="#fff" font-family="Noto Sans JP" font-size="28" font-weight="700">${brand}</text>
  </g>
  ${
    input.dateLabel
      ? `<text x="${CONTENT_X}" y="${dateY}" fill="#fff" fill-opacity="0.92" font-family="Noto Sans JP" font-size="30" font-weight="700" letter-spacing="1" filter="url(#shadow)">${escapeXml(input.dateLabel)}</text>`
      : ""
  }
  <g fill="#fff" font-family="Noto Sans JP" font-size="${fontSize}" font-weight="700" filter="url(#shadow)">
    ${lines
      .map(
        (line, index) =>
          `<text x="${CONTENT_X}" y="${titleStartY + index * lineHeight}">${escapeXml(line)}</text>`,
      )
      .join("\n    ")}
  </g>
</svg>`;
}
