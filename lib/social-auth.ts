/**
 * Which "Continue with …" buttons the login page offers.
 *
 * A provider counts as configured only when both its id and secret are set and
 * neither is still the `your-…` placeholder from .env.example — a button that
 * leads to a Google or Facebook error page is worse than no button at all.
 */

function isSet(v: string | undefined): v is string {
  return !!v && !v.startsWith("your-");
}

export const googleConfig = () =>
  isSet(process.env.GOOGLE_CLIENT_ID) && isSet(process.env.GOOGLE_CLIENT_SECRET)
    ? { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET }
    : null;

export const facebookConfig = () =>
  isSet(process.env.FACEBOOK_CLIENT_ID) && isSet(process.env.FACEBOOK_CLIENT_SECRET)
    ? { clientId: process.env.FACEBOOK_CLIENT_ID, clientSecret: process.env.FACEBOOK_CLIENT_SECRET }
    : null;

export function enabledSocialProviders() {
  return { google: !!googleConfig(), facebook: !!facebookConfig() };
}
