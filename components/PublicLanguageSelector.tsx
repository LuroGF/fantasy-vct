"use client";

import { LanguageSelector } from "./LanguageSelector";

export function PublicLanguageSelector() {
  return (
    <div className="fixed right-4 top-4 z-50 sm:right-6 sm:top-6">
      <LanguageSelector />
    </div>
  );
}
