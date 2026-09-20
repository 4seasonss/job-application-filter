// The profile lives in this browser and nowhere else.
//
// No account, no password, no sync, no server copy. That is a deliberate MVP
// choice rather than a missing feature: with nothing leaving the device there
// is no personal data to secure, and a resume never goes further than the tab
// it was dropped into.

const CONFIG_KEY = 'job-filter.config.v1';
const ONBOARDED_KEY = 'job-filter.onboarded.v1';

export function createLocalStore() {
  return {
    async loadProfile() {
      try {
        return JSON.parse(localStorage.getItem(CONFIG_KEY));
      } catch {
        return null;
      }
    },

    async saveProfile(config) {
      try {
        localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
      } catch {
        // Blocked storage (private windows, strict settings) is survivable —
        // the session keeps working, it just won't be remembered.
      }
    },
  };
}

export const onboarding = {
  seen: () => {
    try {
      return localStorage.getItem(ONBOARDED_KEY) === '1';
    } catch {
      return false;
    }
  },
  markSeen: () => {
    try {
      localStorage.setItem(ONBOARDED_KEY, '1');
    } catch {
      /* ignore */
    }
  },
};
