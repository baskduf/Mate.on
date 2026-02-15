export interface Camera {
  x: number;
  y: number;
}

export function updateCamera(
  camera: Camera,
  targetX: number,
  targetY: number,
  canvasWidth: number,
  canvasHeight: number,
  mapWidth: number,
  mapHeight: number,
  lerp: number
): Camera {
  const cx = camera.x + (targetX - camera.x) * lerp;
  const cy = camera.y + (targetY - camera.y) * lerp;

  return {
    x: clamp(cx, canvasWidth / 2, Math.max(canvasWidth / 2, mapWidth - canvasWidth / 2)),
    y: clamp(cy, canvasHeight / 2, Math.max(canvasHeight / 2, mapHeight - canvasHeight / 2)),
  };
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}
