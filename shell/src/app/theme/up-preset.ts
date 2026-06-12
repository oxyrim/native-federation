import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';
import { upPrimePresetConfig } from '@loan/design-tokens';

/**
 * PrimeNG 21 preset built from the SHARED preset config in @loan/design-tokens.
 * MFE2 builds its PrimeNG 19 preset from the same object, so both PrimeNG
 * generations sharing this document render identically in light AND dark.
 */
export const UpPreset = definePreset(Aura, upPrimePresetConfig);
