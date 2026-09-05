import { supabase } from '../lib/supabase';

export const HOKEX_TERMS_VERSION = '2026-05-20';
export const HOKEX_PRIVACY_VERSION = '2026-05-20';

export type HOKEXConsent = {
  termsVersion: string;
  privacyVersion: string;
  marketingAgreed: boolean;
  ageOver14: boolean;
};

export async function recordCurrentUserConsent(consent: HOKEXConsent): Promise<void> {
  const { error } = await supabase.rpc('record_current_user_consent', {
    p_terms_version: consent.termsVersion,
    p_privacy_version: consent.privacyVersion,
    p_marketing_agreed: consent.marketingAgreed,
    p_age_over_14: consent.ageOver14,
  });
  if (error) throw error;
}

export async function hasCurrentUserConsent(): Promise<boolean> {
  const { data, error } = await supabase.rpc('has_current_user_consent', {
    p_terms_version: HOKEX_TERMS_VERSION,
    p_privacy_version: HOKEX_PRIVACY_VERSION,
  });
  if (error) throw error;
  return Boolean(data);
}
