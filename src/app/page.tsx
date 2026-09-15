import { CheckoutReturn } from "@/components/CheckoutReturn";
import { SessionApp } from "@/components/SessionApp";
import { getUnlockConfig } from "@/lib/stripe-server";

export default function Home() {
  const config = getUnlockConfig();
  return (
    <CheckoutReturn>
      <SessionApp config={config} />
    </CheckoutReturn>
  );
}
