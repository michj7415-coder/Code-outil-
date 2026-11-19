import type { Metadata } from "next";
import { getSettings } from "@/lib/data";
import { requireUser } from "@/lib/supabase/server";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Paramètres" };

export default async function ParametresPage() {
  const { supabase, userId } = await requireUser();
  const settings = await getSettings(supabase, userId);
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Paramètres</h1>
        <p className="text-sm text-muted">Ces valeurs servent à tous tes calculs et conseils.</p>
      </div>
      <SettingsForm initial={settings} />
    </div>
  );
}
