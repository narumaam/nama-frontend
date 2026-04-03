import { Suspense } from "react";

import DealsClientPage from "./page.client";

export default function DealsPage() {
  return (
    <Suspense fallback={<div className="text-[#F5F0E8] font-mono text-sm">Loading alpha case...</div>}>
      <DealsClientPage />
    </Suspense>
  );
}
