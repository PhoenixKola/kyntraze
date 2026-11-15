import '../selector.css';

type Form = 1 | 2 | 3;
interface Props { open: boolean; pick: 0 | 1 | 2 | 3; choices: Form[]; left: number; pad: boolean; onHover: (f: Form) => void; onChoose: (f: Form) => void }
const kit = (n: string) => `${import.meta.env.BASE_URL}ui/kit/${n}.webp`;
const INFO: Record<Form, { name: string; sub: string; crest: string }> = {
  1: { name: 'FLAREBOUND', sub: 'Spends 65% Drive', crest: 'crest-f1' },
  2: { name: 'COMETHEART', sub: 'Full Drive: gold comet', crest: 'crest-f2' },
  3: { name: 'STILLFIRE APEX', sub: 'Full Drive: silver hover', crest: 'crest-f3' },
};
const Key = ({ k, pad }: { k: string; pad?: boolean }) => <kbd className={`keycap ${pad ? 'pad-key' : ''}`}>{k}</kbd>;

/** Transform picker. Opens the instant F is pressed with several forms ready; the run is frozen while it is open. Keys: 1 / 2 / 3 start a card, A / D (or arrows) move, F / Enter / Space confirm, Esc cancels; pad: D-pad or stick, Y / A confirm, B cancels. Double-tap F = the remembered card. */
export function FormSelector({ open, pick, choices, left, pad, onHover, onChoose }: Props) {
  if (!open) return null;
  return <div className="fsel" data-testid="form-selector" role="listbox" aria-label="Choose form">
    <div className="fsel-scrim" aria-hidden="true"/>
    <div className="fsel-panel">
      <p className="fsel-title">TRANSFORM</p>
      <div className="fsel-cards">
        {choices.map((c, i) => <button key={c} type="button" role="option" aria-selected={c === pick} className={`fsel-card f${c} ${c === pick ? 'on' : ''}`} data-testid={`form-opt-${c}`} onMouseEnter={() => onHover(c)} onClick={() => onChoose(c)}>
          <span className="fsel-num" aria-hidden="true">{i + 1}</span>
          <img src={kit(INFO[c].crest)} alt="" draggable={false}/>
          <b>{INFO[c].name}</b><small>{INFO[c].sub}</small>
        </button>)}
      </div>
      <div className="fsel-hint"><span><Key k="1 2 3"/>PICK</span><span><Key k={pad ? 'D-PAD' : 'A D'} pad={pad}/>MOVE</span><span><Key k={pad ? 'Y' : 'F'} pad={pad}/>CONFIRM</span><span><Key k={pad ? 'B' : 'ESC'} pad={pad}/>CANCEL</span></div>
      <i className="fsel-timer" aria-hidden="true"><u style={{ width: `${Math.max(0, Math.min(1, left / 4)) * 100}%` }}/></i>
    </div>
  </div>;
}
