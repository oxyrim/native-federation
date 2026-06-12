import { definePreset } from '@primeng/themes';
import Aura from '@primeng/themes/aura';
import { upPrimePresetConfig } from '@loan/design-tokens';

/**
 * PrimeNG 19 preset built from the SAME shared config the Angular 21 apps
 * use (@loan/design-tokens), including the dark colorScheme — both PrimeNG
 * generations switch together via UP_DARK_MODE_SELECTOR on <html>.
 */
export const UpPreset = definePreset(Aura, upPrimePresetConfig);
