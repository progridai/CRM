import Keycloak, { type KeycloakInitOptions } from 'keycloak-js';

let _instance: Keycloak | null = null;
let _initPromise: Promise<boolean> | null = null;

export function getKeycloakInstance(): Keycloak {
  if (!_instance) {
    _instance = new Keycloak({
      url: import.meta.env.VITE_KEYCLOAK_URL,
      realm: import.meta.env.VITE_KEYCLOAK_REALM,
      clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
    });
  }
  return _instance;
}

export function initKeycloakOnce(options: KeycloakInitOptions): Promise<boolean> {
  if (!_initPromise) {
    _initPromise = getKeycloakInstance().init(options);
  }
  return _initPromise;
}
