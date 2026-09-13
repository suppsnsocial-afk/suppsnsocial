import type { Metadata } from "next";
import { FavouritesApp } from "@/components/FavouritesApp";

export const metadata: Metadata = {
  title: "Saved sessions",
};

export default function FavouritesPage() {
  return <FavouritesApp />;
}
