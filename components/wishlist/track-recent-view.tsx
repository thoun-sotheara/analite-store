"use client";

import { useEffect } from "react";
import { useWishlist } from "@/components/wishlist/wishlist-provider";

export function TrackRecentView({ templateId }: { templateId: string }) {
  const { trackRecentView } = useWishlist();

  useEffect(() => {
    trackRecentView(templateId);
  }, [templateId, trackRecentView]);

  return null;
}
