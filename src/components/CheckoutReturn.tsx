"use client";

import { createContext, Suspense, useContext, type ReactNode } from "react";
import { usePaymentReturn } from "@/hooks/usePaymentReturn";

type PaymentReturn = ReturnType<typeof usePaymentReturn>;

const PaymentReturnContext = createContext<PaymentReturn>({
  verifying: false,
  verifyingWorkout: false,
  verifyingMeal: false,
  error: null,
  cancelledWorkout: false,
  cancelledMeal: false,
});

export function useCheckoutNotice() {
  return useContext(PaymentReturnContext);
}

function CheckoutReturnInner({ children }: { children: ReactNode }) {
  const payment = usePaymentReturn();
  return <PaymentReturnContext.Provider value={payment}>{children}</PaymentReturnContext.Provider>;
}

export function CheckoutReturn({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={children}>
      <CheckoutReturnInner>{children}</CheckoutReturnInner>
    </Suspense>
  );
}
