import { initFederation } from '@angular-architects/native-federation';

// Host-only init: no remotes are pre-registered here. Every remote is
// discovered and registered on demand from the API config via
// loadRemoteModule({ remoteEntry, ... }) — see core/route-factory.ts.
initFederation()
  .catch((err) => console.error(err))
  .then((_) => import('./bootstrap'))
  .catch((err) => console.error(err));
