import decodeAvif, { init as initAvifDecode } from "@jsquash/avif/decode";
import decodeWebp, { init as initWebpDecode } from "@jsquash/webp/decode";
import { initWasm as initResvgWasm, Resvg } from "@resvg/resvg-wasm";

export interface OgWasmAssets {
  resvg: WebAssembly.Module;
  avif: WebAssembly.Module;
  webp: WebAssembly.Module;
}

let resvgReady: Promise<void> | undefined;
let avifReady: Promise<void> | undefined;
let webpReady: Promise<void> | undefined;

function ensureResvg(module: WebAssembly.Module): Promise<void> {
  resvgReady ??= initResvgWasm(module).catch((error) => {
    resvgReady = undefined;
    throw error;
  });
  return resvgReady;
}

function ensureAvif(module: WebAssembly.Module): Promise<void> {
  avifReady ??= initAvifDecode(module).catch((error) => {
    avifReady = undefined;
    throw error;
  });
  return avifReady;
}

function ensureWebp(module: WebAssembly.Module): Promise<void> {
  webpReady ??= initWebpDecode(module).catch((error) => {
    webpReady = undefined;
    throw error;
  });
  return webpReady;
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const size = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const result = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.byteLength;
  }
  return result;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type);
  const output = new Uint8Array(12 + data.byteLength);
  const view = new DataView(output.buffer);
  view.setUint32(0, data.byteLength);
  output.set(typeBytes, 4);
  output.set(data, 8);
  view.setUint32(8 + data.byteLength, crc32(concatBytes([typeBytes, data])));
  return output;
}

async function deflate(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new CompressionStream("deflate");
  const writer = stream.writable.getWriter();
  await writer.write(bytes);
  await writer.close();
  return new Uint8Array(await new Response(stream.readable).arrayBuffer());
}

async function rgbaToPng(
  width: number,
  height: number,
  rgba: Uint8Array | Uint8ClampedArray,
): Promise<Uint8Array> {
  const stride = width * 4;
  const scanlines = new Uint8Array(height * (stride + 1));
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (stride + 1);
    scanlines[rowStart] = 0;
    scanlines.set(rgba.subarray(y * stride, (y + 1) * stride), rowStart + 1);
  }

  const ihdr = new Uint8Array(13);
  const view = new DataView(ihdr.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  ihdr[8] = 8;
  ihdr[9] = 6;

  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  return concatBytes([
    signature,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", await deflate(scanlines)),
    pngChunk("IEND", new Uint8Array()),
  ]);
}

function base64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.byteLength; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

export function bytesToDataUri(bytes: Uint8Array, mimeType: string): string {
  return `data:${mimeType};base64,${base64(bytes)}`;
}

function formatFromResponse(response: Response, pathname: string): "avif" | "webp" | "png" | "jpeg" {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (contentType.includes("avif") || pathname.endsWith(".avif")) return "avif";
  if (contentType.includes("webp") || pathname.endsWith(".webp")) return "webp";
  if (contentType.includes("jpeg") || contentType.includes("jpg") || /\.jpe?g$/i.test(pathname)) return "jpeg";
  return "png";
}

export async function rasterResponseToDataUri(
  response: Response,
  pathname: string,
  assets: OgWasmAssets,
): Promise<string> {
  if (!response.ok) throw new Error(`OG asset fetch failed: ${response.status}`);
  const source = await response.arrayBuffer();
  const format = formatFromResponse(response, pathname);

  if (format === "png" || format === "jpeg") {
    return bytesToDataUri(new Uint8Array(source), format === "png" ? "image/png" : "image/jpeg");
  }

  if (format === "avif") {
    await ensureAvif(assets.avif);
    const image = await decodeAvif(source);
    if (!image) throw new Error("AVIF decode returned no image");
    return bytesToDataUri(await rgbaToPng(image.width, image.height, image.data), "image/png");
  }

  await ensureWebp(assets.webp);
  const image = await decodeWebp(source);
  return bytesToDataUri(await rgbaToPng(image.width, image.height, image.data), "image/png");
}

export async function renderSvgToPng(
  svg: string,
  fontBuffers: Uint8Array[],
  assets: OgWasmAssets,
): Promise<Uint8Array> {
  await ensureResvg(assets.resvg);
  const renderer = new Resvg(svg, {
    fitTo: { mode: "original" },
    font: {
      fontBuffers,
      defaultFontFamily: "Noto Sans JP",
      loadSystemFonts: false,
    },
  });
  try {
    const rendered = renderer.render();
    try {
      return rendered.asPng();
    } finally {
      rendered.free();
    }
  } finally {
    renderer.free();
  }
}
