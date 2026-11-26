import '../selector.css';
import { ASSET_BASE } from '../assetBase';

type Form = 1 | 2 | 3;
interface Props { hero?: string; open: boolean; pick: 0 | 1 | 2 | 3; choices: Form[]; left: number; pad: boolean; onHover: (f: Form) => void; onChoose: (f: Form) => void }
interface Card { name: string; sub: string; cost: string; moves: string[]; img: string; fc: string }
const KAI: Record<Form, Card> = {
  1: { name: 'FLAREBOUND', sub: 'Solar fire and rising pillars', cost: '65% DRIVE', moves: ['Rising Flare', 'Sunfall Crucible', 'Solar Vortex'], img: `${ASSET_BASE}ui/kai-portrait-f1.png`, fc: '#ff8a3c' },
  2: { name: 'COMETHEART', sub: 'Gold lightning comet', cost: 'FULL DRIVE', moves: ['Dragonfang Rush', 'Cometbreaker Cannon', 'Thunderstar Breaker'], img: `${ASSET_BASE}ui/kai-portrait-f2.png`, fc: '#ffe14d' },
  3: { name: 'STILLFIRE APEX', sub: 'Silver hover and precision', cost: 'FULL DRIVE', moves: ['Silver Rift', 'Instinct Reversal', 'Perfect Evasion'], img: `${ASSET_BASE}ui/kai-portrait-f3.png`, fc: '#e6f2ff' },
};
const VEX: Partial<Record<Form, Card>> = {
  1: { name: 'RIFTBOUND', sub: 'Wider parry, faster cooldowns', cost: 'DRIVE', moves: ['Mirror Guard', 'Rift Execution', 'Oath of Ruin'], img: `${ASSET_BASE}ui/heroes/vex-portrait-f1.webp`, fc: '#b46bff' },
  2: { name: 'VOIDHEART EXILE', sub: 'Silver-black precision, marks spread', cost: 'DRIVE', moves: ['Phantom Legion', 'Dimensional Severance', 'Domain of the Exile'], img: `${ASSET_BASE}ui/heroes/vex-portrait-f2.webp`, fc: '#d7dcff' },
};
const SORA: Partial<Record<Form, Card>> = {
  1: { name: 'AZURE SOVEREIGN', sub: 'Azure blades and crystal control', cost: 'FULL DRIVE', moves: ['Azure Prison', "Heaven's Spear", 'Celestial Collapse'], img: `${ASSET_BASE}ui/heroes/sora-portrait-f1.webp`, fc: '#4db8ff' },
  2: { name: 'EVENTIDE SERAPH', sub: 'Star Traces and a celestial Phoenix', cost: 'FULL DRIVE', moves: ['Constellation Pierce', "Seraph's Descent", 'Eventide Judgment'], img: `${ASSET_BASE}ui/heroes/sora-portrait-f2.webp`, fc: '#f0b8d8' },
};
const REN: Partial<Record<Form, Card>> = {
  1: { name: 'CRIMSON ASCENDANT', sub: 'Crimson fury, close-range pressure', cost: 'FULL DRIVE', moves: ['Infernal Cyclone', 'Scarlet Rampage', 'Crimson Catastrophe'], img: `${ASSET_BASE}ui/heroes/ren-portrait-f1.webp`, fc: '#ff4a3a' },
  2: { name: 'ASHEN ECLIPSE', sub: 'Ash Brands and eclipse eruptions', cost: 'FULL DRIVE', moves: ['Eclipse Maul', 'Ninefold Rupture', 'Ashen Cataclysm'], img: `${ASSET_BASE}ui/heroes/ren-portrait-f2.webp`, fc: '#ffb36b' },
};
const Key = ({ k, pad }: { k: string; pad?: boolean }) => <kbd className={`keycap ${pad ? 'pad-key' : ''}`}>{k}</kbd>;
const FRAME: Record<string, string> = { kai: 'frame_kai', vex: 'frame_vex' };

/** Transform picker. Opens the instant F is pressed with several forms ready; the run is frozen while it is open. Keys: 1 / 2 / 3 start a card, A / D (or arrows) move, F / Enter / Space confirm, Esc cancels; pad: D-PAD or stick, Y / A confirm, B cancels. Double-tap F = the remembered card. */
export function FormSelector({ hero, open, pick, choices, left, pad, onHover, onChoose }: Props) {
  if (!open) return null;
  const vex = hero === 'vex', fr = FRAME[hero ?? 'kai'] ?? 'frame_kai';
  return <div className={`fsel fz ${vex ? 'h-vex' : 'h-kai'}`} data-testid="form-selector" role="listbox" aria-label="Choose form">
    <div className="fz-scrim" aria-hidden="true"/>
    <div className="fz-panel">
      <header className="fz-head"><i aria-hidden="true"/><div><p className="fz-title">TRANSFORM</p><small>Choose a form · the fight is frozen while you decide</small></div><i aria-hidden="true"/></header>
      <div className="fz-cards">
        {choices.map((c, i) => { const d = (vex ? VEX[c] : hero === 'ren' ? REN[c] : hero === 'sora' ? SORA[c] : KAI[c]) ?? KAI[c]; return <button key={c} type="button" role="option" aria-selected={c === pick} className={`fz-card ${c === pick ? 'on' : ''}`} style={{ '--fc': d.fc, '--i': i, '--frame': `url(${ASSET_BASE}ui/hud/${fr}.webp)` } as React.CSSProperties} data-testid={`form-opt-${c}`} onMouseEnter={() => onHover(c)} onClick={() => onChoose(c)}>
          <span className="fz-num" aria-hidden="true">{i + 1}</span>
          <span className="fz-art"><img src={d.img} alt="" draggable={false}/></span>
          <b>{d.name}</b><em className="fz-cost">{d.cost}</em><small>{d.sub}</small>
          <span className="fz-moves">{d.moves.map(m => <u key={m}>{m}</u>)}</span>
        </button>; })}
      </div>
      <div className="fz-hint"><span><Key k="1 2 3"/>PICK</span><span><Key k={pad ? 'D-PAD' : 'A D'} pad={pad}/>MOVE</span><span><Key k={pad ? 'Y' : 'F'} pad={pad}/>CONFIRM</span><span><Key k={pad ? 'B' : 'ESC'} pad={pad}/>CANCEL</span></div>
      <i className="fz-timer" aria-hidden="true"><u style={{ width: `${Math.max(0, Math.min(1, left / 4)) * 100}%` }}/></i>
    </div>
  </div>;
}
