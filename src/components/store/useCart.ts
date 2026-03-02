"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const CART_ID_KEY = "pgs_cart_id";
const SESSION_ID_KEY = "pgs_session_id";
const CART_EVENT = "pgs-cart-updated";

function makeSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `sess-${crypto.randomUUID()}`;
  }
  return `sess-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function dispatchCartUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CART_EVENT));
}

export function useCart() {
  const [cartId, setCartIdState] = useState<string | null>(null);
  const [sessionId, setSessionIdState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const syncFromStorage = useCallback(() => {
    if (typeof window === "undefined") return;
    const currentCartId = window.localStorage.getItem(CART_ID_KEY);
    let currentSessionId = window.localStorage.getItem(SESSION_ID_KEY);
    if (!currentSessionId) {
      currentSessionId = makeSessionId();
      window.localStorage.setItem(SESSION_ID_KEY, currentSessionId);
    }
    setCartIdState(currentCartId);
    setSessionIdState(currentSessionId);
    setReady(true);
  }, []);

  useEffect(() => {
    const initialTimer = window.setTimeout(syncFromStorage, 0);
    const listener = () => syncFromStorage();
    window.addEventListener(CART_EVENT, listener);
    window.addEventListener("storage", listener);
    return () => {
      window.clearTimeout(initialTimer);
      window.removeEventListener(CART_EVENT, listener);
      window.removeEventListener("storage", listener);
    };
  }, [syncFromStorage]);

  const setCartId = useCallback((nextCartId: string | null) => {
    if (typeof window !== "undefined") {
      if (nextCartId) window.localStorage.setItem(CART_ID_KEY, nextCartId);
      else window.localStorage.removeItem(CART_ID_KEY);
      dispatchCartUpdated();
    }
    setCartIdState(nextCartId);
  }, []);

  const value = useMemo(
    () => ({
      ready,
      cartId,
      sessionId,
      setCartId,
      refresh: syncFromStorage,
    }),
    [ready, cartId, sessionId, setCartId, syncFromStorage],
  );

  return value;
}
