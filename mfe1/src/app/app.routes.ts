import { Routes } from '@angular/router';
import { PIPELINE_ROUTES } from './pipeline.routes';

/** Standalone-dev routes: mount the exposed routes at the root. */
export const routes: Routes = [{ path: '', children: PIPELINE_ROUTES }];
