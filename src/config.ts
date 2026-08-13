const ASSET_SALT_DOMAIN = '3mh-store.salt.v1'

export const CONFIG = {
  github: {
    owner: import.meta.env.VITE_GITHUB_OWNER ?? '',
    repo: import.meta.env.VITE_GITHUB_REPO ?? '',
    branch: import.meta.env.VITE_GITHUB_BRANCH ?? 'main',
    token: import.meta.env.VITE_GITHUB_TOKEN ?? '',
  },

  admin: {
    pin: import.meta.env.VITE_ADMIN_PIN ?? '1379',
    sessionKey: '3mh-admin-auth',
  },

  assets: {
    secret:
      import.meta.env.VITE_ASSET_SECRET ?? '3mh-store-assets-change-me-2026',
    saltDomain: ASSET_SALT_DOMAIN,
  },

  cartStorageKey: '3mh-store-cart-v1',

  usdToSar: 3.75,
}