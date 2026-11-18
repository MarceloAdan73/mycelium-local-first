// Genera iconos PNG (192 y 512) del logo Mycelium para PWA.
// Uso: node scripts/gen-pwa-icons.mjs
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

const SIZES = [192, 512];
const OUT = "public";
mkdirSync(OUT, { recursive: true });

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = (crc ^ buf[i]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function renderIcon(size) {
  const pxBuf = Buffer.alloc(size * size * 4);

  const setPx = (x, y, r, g, b, a) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    pxBuf[i] = r;
    pxBuf[i + 1] = g;
    pxBuf[i + 2] = b;
    pxBuf[i + 3] = a;
  };

  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      setPx(x, y, 5, 5, 8, 255);

  const cx = size / 2;
  const cy = size / 2;
  const cyan = [0, 212, 255];
  const magenta = [255, 0, 255];
  const nodes = [
    { x: cx - size * 0.1875, y: cy - size * 0.1875, r: size * 0.0625 },
    { x: cx + size * 0.1875, y: cy - size * 0.1875, r: size * 0.0625 },
    { x: cx - size * 0.1875, y: cy + size * 0.1875, r: size * 0.0625 },
    { x: cx + size * 0.1875, y: cy + size * 0.1875, r: size * 0.0625 },
  ];

  const drawCircle = (px, py, rad, [r, g, b], alpha) => {
    const r2 = rad * rad;
    for (let y = Math.floor(py - rad); y <= Math.ceil(py + rad); y++)
      for (let x = Math.floor(px - rad); x <= Math.ceil(px + rad); x++) {
        const d2 = (x - px) * (x - px) + (y - py) * (y - py);
        if (d2 <= r2) setPx(x, y, r, g, b, alpha);
      }
  };

  const drawLine = (x1, y1, x2, y2, [r, g, b], alpha) => {
    const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) * 2;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      setPx(
        Math.round(x1 + (x2 - x1) * t),
        Math.round(y1 + (y2 - y1) * t),
        r, g, b, alpha
      );
    }
  };

  for (const n of nodes) {
    drawLine(n.x, n.y, cx, cy, cyan, 90);
    for (const m of nodes) if (n.x < m.x) drawLine(n.x, n.y, m.x, m.y, cyan, 70);
    drawCircle(n.x, n.y, n.r, cyan, 255);
  }

  drawCircle(cx, cy, size * 0.125, magenta, 255);
  return pxBuf;
}

function encodePng(size, pxBuf) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    pxBuf.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

for (const size of SIZES) {
  const png = encodePng(size, renderIcon(size));
  writeFileSync(`${OUT}/icon-${size}.png`, png);
  console.log(`icon-${size}.png (${png.length} bytes)`);
}