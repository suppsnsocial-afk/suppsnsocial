"use client";

import { useAppMode } from "@/hooks/useAppMode";
import { useFavourites } from "@/hooks/useFavourites";
import type { UnlockConfig } from "@/lib/unlock";
import { AppHeader } from "./AppHeader";
import { MealPrepRoll } from "./MealPrepRoll";
import { ModeSwitch } from "./ModeSwitch";
import { WorkoutRoll } from "./WorkoutRoll";

type SessionAppProps = {
  config: UnlockConfig;
};

export function SessionApp({ config }: SessionAppProps) {
  const { mode, setMode } = useAppMode();
  const { count } = useFavourites();

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader favouriteCount={count} current="home" />
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <ModeSwitch mode={mode} onChange={setMode} />
        {mode === "meal" ? <MealPrepRoll config={config} /> : <WorkoutRoll config={config} />}
        <footer className="pt-2 text-center text-[11px] uppercase tracking-[0.16em] text-muted">
          Supps n Social Ltd
        </footer>
      </main>
    </div>
  );
}
