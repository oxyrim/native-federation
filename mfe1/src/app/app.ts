import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** Standalone-dev root. Inside the shell only PIPELINE_ROUTES are used. */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class App {}
