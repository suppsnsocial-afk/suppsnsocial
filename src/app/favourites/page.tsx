import type { Metadata } from "next";
import { FavouritesApp } from "@/components/FavouritesApp";
import { UnlockGate } from "@/components/UnlockGate";
import { getUnlockConfig } from "@/lib/stripe-server";

export const metadata: Metadata = {
  title: "Saved sessions",
};

export default function FavouritesPage() {
  return (
    <UnlockGate config={getUnlockConfig()}>
      <FavouritesApp />
    </UnlockGate>
  );
}
