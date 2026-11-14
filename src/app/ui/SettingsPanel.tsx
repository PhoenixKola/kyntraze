import type { GameSettings } from '../../sim/SaveSystem';
import { ControllerMap } from './ControllerBadge';
import { HintBar } from './Chrome';
interface Props { settings: GameSettings; onChange: (settings: GameSettings) => void; onClose: () => void; }
export function SettingsPanel({ settings, onChange, onClose }: Props) {
  const toggle = (id: keyof GameSettings) => onChange({ ...settings, [id]: !settings[id] });
  const row = (id: keyof GameSettings, name: string, note: string) => <label><span>{name}<small>{note}</small></span><input type="checkbox" role="switch" checked={settings[id]} onChange={() => toggle(id)}/></label>;
  return <div className="overlay settings-overlay" data-testid="settings-menu"><section className="modal compact-modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="settings-title">
    <p className="eyebrow">LOCAL PLAYER CONFIGURATION</p><h2 id="settings-title">SETTINGS</h2>
    <div className="settings-cols">
      <div><h3 className="group-title">GAME</h3><div className="setting-options">
        {row('mute', 'Mute sound', 'Silences every ability and form sound')}
        {row('reducedEffects', 'Reduced visual effects', 'Removes flashes, halo and camera shake')}
        {row('pauseOnBlur', 'Pause on focus loss', 'Prevents damage while alt-tabbed')}
      </div></div>
      <div><h3 className="group-title">CONTROLS</h3><ControllerMap/></div>
    </div>
    <button className="primary-button" onClick={onClose} data-pad-cancel data-pad-default>SAVE &amp; CLOSE</button>
    <HintBar hints={[{ key: 'ENTER', pad: 'A', label: 'TOGGLE' }, { key: 'ESC', pad: 'B', label: 'CLOSE' }]}/>
  </section></div>;
}
