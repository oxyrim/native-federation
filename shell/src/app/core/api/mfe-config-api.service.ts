import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserContextChanged } from '@loan/bridge';

/**
 * Data-access client for the platform configuration (which microfrontends this
 * user may see, where they mount, and how to load them). In production the
 * server returns a config already scoped to the caller's identity; here it is
 * mocked by `mfe-config.json`.
 *
 * The current user is passed as query params so the call is shaped exactly like
 * the production endpoint (`GET /api/platform-config?userId=…&role=…`). The
 * static mock ignores them; the shell additionally enforces entitlement
 * client-side (see MfeRegistryService) as defence-in-depth.
 */
@Injectable({ providedIn: 'root' })
export class MfeConfigApiService {
  private readonly http = inject(HttpClient);

  getConfig(user: UserContextChanged): Observable<unknown> {
    const params = new HttpParams()
      .set('userId', user.userId)
      .set('role', user.role)
      .set('org', user.organization);

    return this.http.get<unknown>('mfe-config.json', { params });
  }
}
