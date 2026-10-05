"use client";

import { useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { api } from "@/lib/api";

const REF_KEY = "flirtpulse_ref";
const CLAIMED_KEY = "flirtpulse_ref_claimed";

/**
 * Remembers `?ref=CODE` from the URL and, once the visitor is signed in,
 * claims it a single time via /api/referral/claim. Renders nothing.
 */
export function RefCapture() {
  const { data: session, isPending } = useSession();

  useEffect(() => {
    try {
      const code = new URLSearchParams(window.location.search).get("ref");
      if (code && /^[A-Fa-f0-9]{4,16}$/.test(code)) {
        window.localStorage.setItem(REF_KEY, code.toUpperCase());
        console.log("[ref] invite code captured:", code.toUpperCase());
      }
    } catch (err) {
      console.error("[ref] could not capture the invite code:", err);
    }
  }, []);

  const userId = session?.user?.id;

  useEffect(() => {
    if (isPending || !userId) return;
    let code = "";
    try {
      code = window.localStorage.getItem(REF_KEY) || "";
      if (!code || window.localStorage.getItem(CLAIMED_KEY) === userId) return;
    } catch {
      return;
    }
    api.post<{ claimed: boolean }>("/api/referral/claim", { code }).then((res) => {
      const final = res.ok || ["invalid_code", "self_referral"].includes(String(res.error));
      if (!final) {
        console.error("[ref] claim failed, will retry later:", res.error);
        return;
      }
      try {
        // Claimed, already referred, self-referral or invalid code: never retry.
        window.localStorage.setItem(CLAIMED_KEY, userId);
        window.localStorage.removeItem(REF_KEY);
      } catch {
        /* storage unavailable — nothing else to do */
      }
      console.log("[ref] claim result:", res.ok ? res.data : res.error);
    });
  }, [isPending, userId]);

  return null;
}
