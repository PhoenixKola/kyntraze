export type HeroId = 'kai' | 'ren' | 'sora';
export interface HeroDef { id: HeroId; name: string; title: string; accent: string; weapon: string; role: string; playable: boolean; forms: readonly string[] }
export const HEROES: readonly HeroDef[] = [
  { id: 'kai', name: 'KAI', title: 'KINETIC VANGUARD', accent: '#eeb56c', weapon: 'Comet Fists', role: 'Close-range impact · momentum', playable: true, forms: ['base', 'flarebound', 'cometheart', 'stillfire-apex'] },
  { id: 'ren', name: 'REN', title: 'CRIMSON WARDEN', accent: '#f1817b', weapon: 'Cinder Crescent', role: 'Heat marks · zone control', playable: false, forms: ['base', 'flameveil', 'ash-sovereign', 'crimson-null'] },
  { id: 'sora', name: 'SORA', title: 'VOLT NOMAD', accent: '#89e2ee', weapon: 'Arc Needle', role: 'Long-range chains · mobility', playable: false, forms: ['base', 'sparkcrest', 'thunderwake', 'quiet-tempest'] },
];
