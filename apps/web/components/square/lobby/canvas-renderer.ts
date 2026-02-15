import type { Camera } from "./camera";
import {
  TILE_SIZE,
  MAP_COLS,
  MAP_ROWS,
  TILES,
  DECORATIONS,
  TILE_GRASS_1,
  TILE_GRASS_2,
  TILE_GRASS_3,
  TILE_PATH,
} from "./map-data";

export interface PlayerRenderState {
  userId: string;
  displayName: string;
  x: number;
  y: number;
  isLocal: boolean;
  avatarCanvas: HTMLCanvasElement | null;
  chatBubble?: { text: string; expiresAt: number };
}

// Ghibli-inspired color palette
const GRASS_COLORS = ["#8FBC5A", "#7DAD4E", "#A1C96A"];
const PATH_COLOR = "#D4C4A0";
const WATER_COLOR = "#6FB5C4";
const WATER_EDGE_COLOR = "#5FA5B4";

const TREE_TRUNK_COLOR = "#8B6F47";
const TREE_FOLIAGE_COLORS = ["#4A8C3F", "#5A9C4F", "#3A7C2F"];
const FLOWER_COLORS = ["#E8956D", "#F0B0D0", "#FFD866", "#C4A0E8"];
const ROCK_COLOR = "#9E9E8E";
const ROCK_SHADOW_COLOR = "#7E7E6E";

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  canvasWidth: number,
  canvasHeight: number,
  players: PlayerRenderState[],
  now: number
) {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  const offsetX = canvasWidth / 2 - camera.x;
  const offsetY = canvasHeight / 2 - camera.y;

  // Determine visible tile range
  const startCol = Math.max(0, Math.floor((camera.x - canvasWidth / 2) / TILE_SIZE));
  const endCol = Math.min(MAP_COLS, Math.ceil((camera.x + canvasWidth / 2) / TILE_SIZE));
  const startRow = Math.max(0, Math.floor((camera.y - canvasHeight / 2) / TILE_SIZE));
  const endRow = Math.min(MAP_ROWS, Math.ceil((camera.y + canvasHeight / 2) / TILE_SIZE));

  // Render ground tiles
  for (let row = startRow; row < endRow; row++) {
    for (let col = startCol; col < endCol; col++) {
      const tile = TILES[row][col];
      const sx = col * TILE_SIZE + offsetX;
      const sy = row * TILE_SIZE + offsetY;

      if (tile === TILE_GRASS_1 || tile === TILE_GRASS_2 || tile === TILE_GRASS_3) {
        ctx.fillStyle = GRASS_COLORS[tile];
        ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);

        // Subtle grass detail
        ctx.fillStyle = GRASS_COLORS[(tile + 1) % 3];
        const seed = (row * 37 + col * 53) % 7;
        for (let i = 0; i < 3; i++) {
          const dx = ((seed + i * 23) % TILE_SIZE);
          const dy = ((seed + i * 17) % TILE_SIZE);
          ctx.fillRect(sx + dx, sy + dy, 2, 4);
        }
      } else if (tile === TILE_PATH) {
        ctx.fillStyle = PATH_COLOR;
        ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
        // Path texture dots
        ctx.fillStyle = "#C8B890";
        const seed = (row * 37 + col * 53) % 5;
        ctx.beginPath();
        ctx.arc(sx + 15 + seed * 3, sy + 20 + seed * 2, 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Water tile
        ctx.fillStyle = WATER_COLOR;
        ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
        // Animated wave effect
        ctx.fillStyle = WATER_EDGE_COLOR;
        const waveOffset = Math.sin(now / 800 + col * 0.5 + row * 0.3) * 3;
        ctx.fillRect(sx, sy + 30 + waveOffset, TILE_SIZE, 4);
      }
    }
  }

  // Grid lines (subtle)
  ctx.strokeStyle = "rgba(0,0,0,0.03)";
  ctx.lineWidth = 1;
  for (let row = startRow; row <= endRow; row++) {
    const y = row * TILE_SIZE + offsetY;
    ctx.beginPath();
    ctx.moveTo(startCol * TILE_SIZE + offsetX, y);
    ctx.lineTo(endCol * TILE_SIZE + offsetX, y);
    ctx.stroke();
  }
  for (let col = startCol; col <= endCol; col++) {
    const x = col * TILE_SIZE + offsetX;
    ctx.beginPath();
    ctx.moveTo(x, startRow * TILE_SIZE + offsetY);
    ctx.lineTo(x, endRow * TILE_SIZE + offsetY);
    ctx.stroke();
  }

  // Render decorations (below players)
  for (const deco of DECORATIONS) {
    const dx = deco.x + offsetX;
    const dy = deco.y + offsetY;

    // Check if visible
    if (dx < -128 || dx > canvasWidth + 128 || dy < -192 || dy > canvasHeight + 128) continue;

    if (deco.type === "tree_1" || deco.type === "tree_2") {
      drawTree(ctx, dx, dy, deco.type === "tree_1");
    } else if (deco.type === "flower_1" || deco.type === "flower_2") {
      drawFlower(ctx, dx, dy, deco.type === "flower_1" ? 0 : 1);
    } else if (deco.type === "rock") {
      drawRock(ctx, dx, dy);
    } else if (deco.type === "bush") {
      drawBush(ctx, dx, dy);
    }
  }

  // Sort players by Y for depth ordering
  const sortedPlayers = [...players].sort((a, b) => a.y - b.y);

  for (const player of sortedPlayers) {
    const px = player.x + offsetX;
    const py = player.y + offsetY;

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.beginPath();
    ctx.ellipse(px, py + 4, 18, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Avatar
    if (player.avatarCanvas) {
      ctx.drawImage(player.avatarCanvas, px - 32, py - 64, 64, 64);
    } else {
      // Fallback: simple colored circle
      ctx.fillStyle = player.isLocal ? "#4A7C59" : "#87BBCA";
      ctx.beginPath();
      ctx.arc(px, py - 24, 16, 0, Math.PI * 2);
      ctx.fill();

      // Body
      ctx.fillStyle = player.isLocal ? "#5A8C69" : "#97CBDA";
      ctx.fillRect(px - 10, py - 12, 20, 16);
      ctx.beginPath();
      ctx.arc(px, py - 12, 10, Math.PI, 0);
      ctx.fill();
    }

    // Name tag
    const name = player.displayName || "???";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    const nameWidth = ctx.measureText(name).width;

    // Background pill
    ctx.fillStyle = player.isLocal ? "rgba(74, 124, 89, 0.85)" : "rgba(60, 56, 52, 0.7)";
    const pillPadding = 6;
    const pillHeight = 16;
    ctx.beginPath();
    ctx.roundRect(px - nameWidth / 2 - pillPadding, py + 8, nameWidth + pillPadding * 2, pillHeight, 8);
    ctx.fill();

    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(name, px, py + 20);

    // Chat bubble
    if (player.chatBubble && player.chatBubble.expiresAt > now) {
      drawChatBubble(ctx, px, py - 72, player.chatBubble.text, player.chatBubble.expiresAt, now);
    }
  }
}

function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, large: boolean) {
  const scale = large ? 1 : 0.75;
  // Trunk
  ctx.fillStyle = TREE_TRUNK_COLOR;
  ctx.fillRect(x - 5 * scale, y - 40 * scale, 10 * scale, 40 * scale);

  // Foliage layers (Ghibli-style round canopy)
  const foliageY = y - 40 * scale;
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = TREE_FOLIAGE_COLORS[i];
    ctx.beginPath();
    ctx.ellipse(
      x + (i - 1) * 12 * scale,
      foliageY - i * 8 * scale,
      24 * scale,
      20 * scale,
      0, 0, Math.PI * 2
    );
    ctx.fill();
  }

  // Top crown
  ctx.fillStyle = TREE_FOLIAGE_COLORS[1];
  ctx.beginPath();
  ctx.ellipse(x, foliageY - 28 * scale, 18 * scale, 16 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawFlower(ctx: CanvasRenderingContext2D, x: number, y: number, variant: number) {
  // Stem
  ctx.strokeStyle = "#6B8E3A";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - 12);
  ctx.stroke();

  // Petals
  const color = FLOWER_COLORS[variant * 2];
  ctx.fillStyle = color;
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(angle) * 4, y - 14 + Math.sin(angle) * 4, 3, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Center
  ctx.fillStyle = "#FFD866";
  ctx.beginPath();
  ctx.arc(x, y - 14, 2.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawRock(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = ROCK_SHADOW_COLOR;
  ctx.beginPath();
  ctx.ellipse(x + 2, y + 2, 16, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = ROCK_COLOR;
  ctx.beginPath();
  ctx.ellipse(x, y, 16, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Highlight
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.beginPath();
  ctx.ellipse(x - 4, y - 4, 6, 4, -0.3, 0, Math.PI * 2);
  ctx.fill();
}

function drawBush(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const colors = ["#5A9C4F", "#4A8C3F", "#6AAC5F"];
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = colors[i];
    ctx.beginPath();
    ctx.ellipse(x + (i - 1) * 10, y - 4, 14, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawChatBubble(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  expiresAt: number,
  now: number
) {
  const remaining = expiresAt - now;
  const alpha = Math.min(1, remaining / 500); // fade in last 500ms

  ctx.save();
  ctx.globalAlpha = alpha;

  ctx.font = "12px sans-serif";
  ctx.textAlign = "center";
  const lines = wrapText(ctx, text, 140);
  const lineHeight = 16;
  const bubbleWidth = Math.max(60, Math.min(160, ctx.measureText(text).width + 20));
  const bubbleHeight = lines.length * lineHeight + 12;

  // Bubble background
  ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
  ctx.beginPath();
  ctx.roundRect(x - bubbleWidth / 2, y - bubbleHeight, bubbleWidth, bubbleHeight, 10);
  ctx.fill();

  // Bubble border
  ctx.strokeStyle = "rgba(74, 124, 89, 0.3)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Bubble tail
  ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
  ctx.beginPath();
  ctx.moveTo(x - 5, y);
  ctx.lineTo(x + 5, y);
  ctx.lineTo(x, y + 6);
  ctx.closePath();
  ctx.fill();

  // Text
  ctx.fillStyle = "#3B3834";
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], x, y - bubbleHeight + 16 + i * lineHeight);
  }

  ctx.restore();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  if (ctx.measureText(text).width <= maxWidth) return [text];

  const words = text.split("");
  const lines: string[] = [];
  let current = "";

  for (const char of words) {
    const test = current + char;
    if (ctx.measureText(test).width > maxWidth) {
      lines.push(current);
      current = char;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 3); // max 3 lines
}
