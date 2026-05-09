"use client";

const RESET_TEAM_FILTER_ONCE_KEY = "tickets:reset-team-filter-once";

function canUseSessionStorage() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

export function markTicketsTeamFilterReset() {
  if (!canUseSessionStorage()) return;
  window.sessionStorage.setItem(RESET_TEAM_FILTER_ONCE_KEY, "1");
}

export function consumeTicketsTeamFilterReset() {
  if (!canUseSessionStorage()) return false;

  const shouldReset = window.sessionStorage.getItem(RESET_TEAM_FILTER_ONCE_KEY) === "1";
  if (shouldReset) {
    window.sessionStorage.removeItem(RESET_TEAM_FILTER_ONCE_KEY);
  }

  return shouldReset;
}
