export interface AvatarGradient {
  id: string;
  from: string;
  to: string;
  text: string;
}

export const AVATAR_GRADIENTS: readonly AvatarGradient[] = [
  { id: 'red',     from: '#ff2e3e', to: '#7a0010', text: '#ffffff' },
  { id: 'blue',    from: '#1ea7ff', to: '#0a3370', text: '#ffffff' },
  { id: 'green',   from: '#1fd66a', to: '#08401d', text: '#ffffff' },
  { id: 'gold',    from: '#ffd400', to: '#8a6a00', text: '#111111' },
  { id: 'magenta', from: '#ff3da3', to: '#5a0a3a', text: '#ffffff' },
  { id: 'cyan',    from: '#22d3ee', to: '#0a4555', text: '#111111' },
  { id: 'violet',  from: '#a855f7', to: '#3b0764', text: '#ffffff' },
  { id: 'amber',   from: '#f97316', to: '#5a2200', text: '#ffffff' },
];

function hash(s: string): number {
  // FNV-1a 32-bit
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
}

export function seedToGradient(seed: string): AvatarGradient {
  const h = hash(seed || 'default');
  const idx = h % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[idx]!;
}

export function initialsFor(firstName: string, lastName: string): string {
  const f = (firstName?.trim()?.[0] ?? '').toUpperCase();
  const l = (lastName?.trim()?.[0] ?? '').toUpperCase();
  return (f + l) || '?';
}
