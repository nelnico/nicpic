"use client";

import { useEffect } from "react";

export function ContentGuard() {
  useEffect(() => {
    const blockMenu = (e: MouseEvent) => e.preventDefault();

    const blockKeys = (e: KeyboardEvent) => {
      if (e.key === "F12") {
        e.preventDefault();
        return;
      }
      if (
        e.ctrlKey &&
        e.shiftKey &&
        ["I", "J", "C"].includes(e.key.toUpperCase())
      ) {
        e.preventDefault();
        return;
      }
      if (e.ctrlKey && e.key.toUpperCase() === "U") {
        e.preventDefault();
      }
    };

    document.addEventListener("contextmenu", blockMenu);
    document.addEventListener("keydown", blockKeys);
    return () => {
      document.removeEventListener("contextmenu", blockMenu);
      document.removeEventListener("keydown", blockKeys);
    };
  }, []);

  return null;
}
