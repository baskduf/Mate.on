export const TILE_SIZE = 64;
export const MAP_COLS = 40;
export const MAP_ROWS = 30;
export const MAP_WIDTH = MAP_COLS * TILE_SIZE;
export const MAP_HEIGHT = MAP_ROWS * TILE_SIZE;

export const SPAWN_X = MAP_WIDTH / 2;
export const SPAWN_Y = MAP_HEIGHT / 2;

export const PLAYER_SPEED = 200; // pixels per second

// Tile types
export const TILE_GRASS_1 = 0;
export const TILE_GRASS_2 = 1;
export const TILE_GRASS_3 = 2;
export const TILE_PATH = 3;
export const TILE_WATER = 4;

// Generate a simple map procedurally
function generateTiles(): number[][] {
  const tiles: number[][] = [];
  for (let row = 0; row < MAP_ROWS; row++) {
    tiles[row] = [];
    for (let col = 0; col < MAP_COLS; col++) {
      // Water border
      if (row === 0 || row === MAP_ROWS - 1 || col === 0 || col === MAP_COLS - 1) {
        tiles[row][col] = TILE_WATER;
        continue;
      }
      // Paths in cross pattern through center
      if ((col >= 18 && col <= 21) || (row >= 13 && row <= 16)) {
        tiles[row][col] = TILE_PATH;
        continue;
      }
      // Random grass variety
      const r = Math.abs(Math.sin(row * 37 + col * 53) * 10000) % 10;
      tiles[row][col] = r < 5 ? TILE_GRASS_1 : r < 8 ? TILE_GRASS_2 : TILE_GRASS_3;
    }
  }
  return tiles;
}

export interface Decoration {
  type: "tree_1" | "tree_2" | "flower_1" | "flower_2" | "rock" | "bush";
  x: number; // pixel position
  y: number;
  blocking: boolean;
}

function generateDecorations(): Decoration[] {
  const decos: Decoration[] = [];
  const occupied = new Set<string>();

  // Place trees around the map edges (inside the water border)
  const treePositions = [
    // Top area
    [3, 3], [7, 2], [12, 3], [15, 2], [25, 3], [30, 2], [35, 3],
    // Bottom area
    [5, 26], [10, 27], [15, 26], [28, 27], [33, 26], [37, 27],
    // Left side
    [2, 7], [3, 12], [2, 18], [3, 23],
    // Right side
    [37, 6], [36, 11], [37, 18], [36, 24],
    // Scattered in quadrants
    [8, 6], [10, 9], [6, 20], [9, 24],
    [30, 7], [33, 10], [28, 22], [34, 20],
  ];

  for (const [col, row] of treePositions) {
    const key = `${col},${row}`;
    if (!occupied.has(key)) {
      occupied.add(key);
      decos.push({
        type: Math.random() > 0.5 ? "tree_1" : "tree_2",
        x: col * TILE_SIZE + TILE_SIZE / 2,
        y: row * TILE_SIZE + TILE_SIZE,
        blocking: true,
      });
    }
  }

  // Flowers and bushes
  const flowerPositions = [
    [5, 5], [7, 8], [11, 4], [14, 7], [26, 5], [32, 8],
    [4, 22], [8, 25], [12, 21], [27, 24], [31, 22], [35, 25],
    [6, 11], [10, 19], [29, 10], [33, 19],
  ];

  for (const [col, row] of flowerPositions) {
    decos.push({
      type: Math.random() > 0.5 ? "flower_1" : "flower_2",
      x: col * TILE_SIZE + TILE_SIZE / 2,
      y: row * TILE_SIZE + TILE_SIZE / 2,
      blocking: false,
    });
  }

  // Rocks
  const rockPositions = [
    [9, 7], [31, 9], [7, 23], [32, 24], [16, 5], [24, 25],
  ];

  for (const [col, row] of rockPositions) {
    decos.push({
      type: "rock",
      x: col * TILE_SIZE + TILE_SIZE / 2,
      y: row * TILE_SIZE + TILE_SIZE / 2,
      blocking: true,
    });
  }

  return decos;
}

function generateCollisionMap(tiles: number[][], decorations: Decoration[]): boolean[][] {
  const map: boolean[][] = [];
  for (let row = 0; row < MAP_ROWS; row++) {
    map[row] = [];
    for (let col = 0; col < MAP_COLS; col++) {
      map[row][col] = tiles[row][col] === TILE_WATER;
    }
  }

  // Mark blocking decorations
  for (const deco of decorations) {
    if (deco.blocking) {
      const col = Math.floor(deco.x / TILE_SIZE);
      const row = Math.floor((deco.y - TILE_SIZE / 2) / TILE_SIZE);
      if (row >= 0 && row < MAP_ROWS && col >= 0 && col < MAP_COLS) {
        map[row][col] = true;
      }
    }
  }

  return map;
}

export const TILES = generateTiles();
export const DECORATIONS = generateDecorations();
export const COLLISION_MAP = generateCollisionMap(TILES, DECORATIONS);

export function isWalkable(px: number, py: number): boolean {
  const col = Math.floor(px / TILE_SIZE);
  const row = Math.floor(py / TILE_SIZE);
  if (row < 0 || row >= MAP_ROWS || col < 0 || col >= MAP_COLS) return false;
  return !COLLISION_MAP[row][col];
}
