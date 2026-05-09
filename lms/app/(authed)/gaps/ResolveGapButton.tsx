"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export function ResolveGapButton({ gapId }: { gapId: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function resolve() {
    if (!confirm("Mark this gap resolved? Use only if you're sure no assignment cleared it.")) {
      return;
    }
    setBusy(true);
    const supabase = getSupabaseBrowserClient();
    await supabase
      .from("gaps")
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq("id", gapId);
    setBusy(false);
    router.refresh();
  }

  return (
    <Button variant="ghost" onClick={resolve} disabled={busy}>
      {busy ? "..." : "Resolve"}
    </Button>
  );
}
