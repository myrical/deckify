"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function MetaAdsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const clientId = searchParams.get("client");

  useEffect(() => {
    if (clientId) {
      router.replace(`/dashboard/clients/${clientId}`);
    } else {
      router.replace("/dashboard/clients");
    }
  }, [clientId, router]);

  return (
    <div className="p-6">
      <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>Redirecting...</p>
    </div>
  );
}
