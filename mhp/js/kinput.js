// Casilla numérica del coeficiente k: admite decimales y actualiza todos los registros al cambiar.
import { LAB } from './config.js';
import { t, fmtNum } from './i18n.js';
import { getState, setK } from './store.js';
import { toast } from './dom.js';

export function bindKInput(input) {
  input.min = String(LAB.K_MIN);
  input.max = String(LAB.K_MAX);
  input.step = '0.01';
  input.addEventListener('change', () => {
    const v = input.valueAsNumber;
    if (!Number.isFinite(v) || v < LAB.K_MIN || v > LAB.K_MAX) {
      toast(t('k_invalid', { min: fmtNum(LAB.K_MIN), max: fmtNum(LAB.K_MAX) }), { kind: 'warn' });
      input.value = String(getState().k);
      return;
    }
    setK(v);
  });
  input.addEventListener('keydown', e => { if (e.key === 'Enter') input.blur(); });
}

export function syncKInput(input) {
  if (document.activeElement !== input) input.value = String(getState().k);
}
