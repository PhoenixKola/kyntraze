/** UI view of everything B22 asks the player to decide or shows during a run (branch / relic / legendary offers, the ultimate gauge, Endless extract). Pure read of GameState. */
import type { GameState } from '../sim/GameState';
import { BRANCH_BY_ID, REN_FORM_NOTE, SORA_FORM_NOTE, VEX_FORM_NOTE, type Slot } from '../b22/branches';
import { RELIC_BY_ID } from '../b22/relics';
import { LEGENDARY_BY_ID, LEGENDARIES, REN_FORM_LEGEND, SORA_FORM_LEGEND, VEX_FORM_LEGEND, recipeProgress } from '../b22/legendary';
import { ULTIMATES } from '../b22/mastery';
import { UPGRADE_BY_ID } from '../content/upgrades';

export interface AscCard { id: string; name: string; sub: string; lines: string[]; icon: string; accent?: string }
export interface AscView {
  branch: { slot: Slot; skill: string; cards: AscCard[] } | null; relics: AscCard[] | null; legend: AscCard | null;
  extract: { cycle: number } | null; canEndless: boolean; endless: { cycle: number; extracted: boolean } | null;
  ult: { name: string; unlocked: boolean; charge: number; cd: number; ready: boolean; active: boolean } | null;
  relicsOwned: AscCard[]; branchesOwned: AscCard[]; legendsOwned: AscCard[]; recipes: { id: string; name: string; met: number; total: number; needs: string }[];
  mode: string; modeName: string;
}
const branchCard = (id: keyof typeof BRANCH_BY_ID): AscCard => { const b = BRANCH_BY_ID[id]; return { id, name: b.name, sub: `${b.skill} · BRANCH ${b.side}`, lines: [`+ ${b.gain}`, `− ${b.cost}`, ...((REN_FORM_NOTE[id] ?? SORA_FORM_NOTE[id] ?? VEX_FORM_NOTE[id]) ? [(REN_FORM_NOTE[id] ?? SORA_FORM_NOTE[id] ?? VEX_FORM_NOTE[id])!] : [])], icon: b.icon }; };
const relicCard = (id: keyof typeof RELIC_BY_ID): AscCard => { const r = RELIC_BY_ID[id]; return { id, name: r.name, sub: `${r.realm === 'aetherfall' ? 'AETHERFALL' : 'PARADOX'} RELIC`, lines: [`Trigger: ${r.trigger}`, r.effect, `Limit: ${r.limit}`], icon: r.icon, accent: r.accent }; };
const legendCard = (id: keyof typeof LEGENDARY_BY_ID): AscCard => { const l = LEGENDARY_BY_ID[id]; return { id, name: l.name, sub: 'LEGENDARY RECIPE', lines: [l.effect, `Limit: ${l.limit}`, ...((REN_FORM_LEGEND[id] ?? SORA_FORM_LEGEND[id] ?? VEX_FORM_LEGEND[id]) ? [(REN_FORM_LEGEND[id] ?? SORA_FORM_LEGEND[id] ?? VEX_FORM_LEGEND[id])!] : [])], icon: l.icon }; };
export function ascView(s: GameState): AscView {
  const b = s.b22, o = b.branchOffer, u = b.ult;
  const recipes = LEGENDARIES.filter(l => l.hero === s.hero && !b.legendary.includes(l.id)).map(l => { const p = recipeProgress(l, s.upgradeStacks); return { id: l.id, name: l.name, met: p.met, total: p.total, needs: l.needs.map(n => `${UPGRADE_BY_ID[n.id].name} ×${n.stacks}`).join(' + ') }; });
  return {
    branch: o ? { slot: o.slot, skill: BRANCH_BY_ID[o.a].skill, cards: [branchCard(o.a), branchCard(o.b)] } : null,
    relics: b.relicOffer ? b.relicOffer.map(relicCard) : null, legend: b.legendOffer && s.phase === 'upgrade' ? legendCard(b.legendOffer) : null,
    extract: s.phase === 'extract' && b.endless ? { cycle: b.endless.cycle } : null, canEndless: s.phase === 'victory' && s.plan.mode === 'classic', endless: b.endless ? { cycle: b.endless.cycle, extracted: b.endless.extracted } : null,
    ult: u.unlocked ? { name: ULTIMATES[s.hero].name, unlocked: true, charge: u.charge, cd: u.cd, ready: u.charge >= 100 && u.cd <= 0 && !u.act, active: !!u.act } : null,
    relicsOwned: b.relics.map(relicCard), branchesOwned: b.branches.map(branchCard), legendsOwned: b.legendary.map(legendCard), recipes,
    mode: s.plan.mode, modeName: s.plan.name,
  };
}
