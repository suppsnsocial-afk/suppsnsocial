import type { Metadata } from "next";
import { CheckoutReturn } from "@/components/CheckoutReturn";
import { FavouritesApp } from "@/components/FavouritesApp";
import { getUnlockConfig } from "@/lib/stripe-server";

export const metadata: Metadata = {
  title: "Saved ideas",
};

export default function FavouritesPage() {
  return (
    <CheckoutReturn>
      <FavouritesApp config={getUnlockConfig()} />
    </CheckoutReturn>
  );
}
