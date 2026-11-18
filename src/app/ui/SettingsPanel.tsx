import { useEffect, type CSSProperties } from 'react';
import type { GameSettings, VolumeKey } from '../../sim/SaveSystem';
import { ControllerMap } from './ControllerBadge';
import { HintBar, ModalX } from './Chrome';
interface Props { settings: GameSettings; onChange: (settings: GameSettings) => void; onClose: () => void; }
export function SettingsPanel({ settings, onChange, onClose }: Props) {
  // capture phase + stopPropagation: Esc closes Settings only; it must not also reach the game's pause toggle underneath
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(); } }; window.addEventListener('keydown', h, true); return () => window.removeEventListener('keydown', h, true); }, [onClose]);
  const toggle = (id: 'mute' | 'reducedEffects' | 'pauseOnBlur') => onChange({ ...settings, [id]: !settings[id] });
  const slider = (id: VolumeKey, name: string, note: string) => <label className="vol-row"><span>{name}<small>{note}</small></span><em className="sw-state vol-num" aria-hidden="true">{Math.round(settings[id] * 100)}</em>
    <input type="range" className="vol-slider" min={0} max={100} step={5} value={Math.round(settings[id] * 100)} aria-label={`${name} volume`} style={{ '--p': `${Math.round(settings[id] * 100)}%` } as CSSProperties} onChange={e => onChange({ ...settings, [id]: Number(e.target.value) / 100 })}/></label>;
  const row = (id: 'mute' | 'reducedEffects' | 'pauseOnBlur', name: string, note: string) => <label><span>{name}<small>{note}</small></span><em className={`sw-state ${settings[id] ? 'sw-on' : ''}`} aria-hidden="true">{settings[id] ? 'ON' : 'OFF'}</em><input type="checkbox" role="switch" checked={settings[id]} onChange={() => toggle(id)}/></label>;
  return <div className="overlay settings-overlay" data-testid="settings-menu"><section className="modal compact-modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="settings-title">
    <ModalX onClose={onClose}/>
    <p className="eyebrow">LOCAL PLAYER CONFIGURATION</p><h2 id="settings-title">SETTINGS</h2>
    <div className="settings-cols">
      <div><h3 className="group-title">GAME</h3><div className="setting-options">
        {row('mute', 'Mute sound', 'Silences music, effects and UI')}
        {slider('master', 'Master volume', 'Overall level')}
        {slider('music', 'Music', 'The score')}
        {slider('sfx', 'Sound effects', 'Combat, abilities, enemies, ambience')}
        {slider('ui', 'Interface', 'Clicks, level-up, pickups')}
        {row('reducedEffects', 'Reduced visual effects', 'Removes flashes, halo and camera shake')}
        {row('pauseOnBlur', 'Pause on focus loss', 'Prevents damage while alt-tabbed')}
      </div></div>
      <div><h3 className="group-title">CONTROLS</h3><ControllerMap/></div>
    </div>
    <button className="primary-button" onClick={onClose} data-pad-cancel data-pad-default>SAVE &amp; CLOSE</button>
    <HintBar hints={[{ key: 'ENTER', pad: 'A', label: 'TOGGLE' }, { key: 'ESC', pad: 'B', label: 'CLOSE' }]}/>
  </section></div>;
}
