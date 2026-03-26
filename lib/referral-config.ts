export const REFERRAL_CONFIG = {
  /** Credits awarded to the referrer when friend qualifies */
  REFERRER_REWARD: 120,
  /** Bonus credits given to the referred user on signup */
  REFERRED_USER_BONUS: 120,
  /** Maximum successful referrals per user (lifetime) */
  MAX_REFERRALS_PER_USER: 20,
  /** Maximum referrals per day (anti-abuse) */
  MAX_REFERRALS_PER_DAY: 5,
  /** Minimum user messages in a session to count toward qualification */
  QUALIFICATION_MIN_MESSAGES: 3,
  /** Minimum qualifying sessions needed for referrer payout */
  QUALIFICATION_MIN_SESSIONS: 1,
  /** Referral code prefix */
  CODE_PREFIX: "sage_",
};
