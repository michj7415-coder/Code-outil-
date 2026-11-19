"use client";

import { buttonClass } from "@/components/ui";

export function DeleteButton({ id, name, action }: { id: string; name: string; action: (fd: FormData) => Promise<void> }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(`Supprimer « ${name} » ? Cette action est définitive.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button className={buttonClass("danger", "h-9 text-xs")}>Supprimer</button>
    </form>
  );
}
