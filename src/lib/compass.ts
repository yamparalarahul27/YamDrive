export function compassDirection(heading: number | null): string {
  if (heading === null || !Number.isFinite(heading)) return '—';
  const angle = ((heading % 360) + 360) % 360;
  return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(angle / 45) % 8];
}

/** Continue across north by the shortest arc, rather than spinning a full turn. */
export function unwrapAngle(previous: number, next: number): number {
  return previous + ((((next - previous) % 360) + 540) % 360) - 180;
}

/** Keep standard compass order, using a smaller letter for the weaker axis. */
export function compassLabel(heading: number | null): string {
  const direction = compassDirection(heading);
  if (heading === null || direction.length !== 2) return direction;
  const angle = ((heading % 360) + 360) % 360;
  const verticalDistance = Math.min(angle, Math.abs(angle - 180), 360 - angle);
  const horizontalDistance = Math.min(Math.abs(angle - 90), Math.abs(angle - 270));
  if (Math.abs(verticalDistance - horizontalDistance) < 0.001) return direction;
  return verticalDistance < horizontalDistance
    ? direction[0] + direction[1].toLowerCase()
    : direction[0].toLowerCase() + direction[1];
}
