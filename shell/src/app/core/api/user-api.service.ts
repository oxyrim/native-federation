import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserContextChanged } from '@loan/bridge';

/**
 * Data-access client for the authenticated user ("who am I"). In production
 * this is the identity/session endpoint; here it is mocked by `user.json`.
 *
 * The user is fetched FIRST at startup — its details (role, org, id) are then
 * used to request the user-specific platform config. See PlatformBootstrapService.
 */
@Injectable({ providedIn: 'root' })
export class UserApiService {
  private readonly http = inject(HttpClient);

  /** The shell's notion of "the current user" matches the bridge contract. */
  getCurrentUser(): Observable<UserContextChanged> {
    return this.http.get<UserContextChanged>('user.json');
  }
}
