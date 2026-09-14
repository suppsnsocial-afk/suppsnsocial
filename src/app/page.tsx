import { SessionApp } from "@/components/SessionApp";
import { UnlockGate } from "@/components/UnlockGate";
import { getUnlockConfig } from "@/lib/stripe-server";

export default function Home() {
  return (
    <UnlockGate config={getUnlockConfig()}>
      <SessionApp />
    </UnlockGate>
  );
}
