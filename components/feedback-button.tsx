"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { submitFeedback } from "@/app/avis/actions";
import { FEEDBACK_QUESTION } from "@/lib/validation/feedback";
import type { FormState } from "@/lib/validation/form";
import { IconCheck, IconMessage, IconStar } from "./icons";
import { Alert, Button, cx, inputClass } from "./ui";

const LABELS = ["", "Pas utile", "Peu utile", "Correct", "Utile", "Indispensable"];

/** Bouton « Donner mon avis » + fenêtre (note de 1 à 5 et une question). */
export function FeedbackButton() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();
  const [state, action, pending] = useActionState<FormState, FormData>(submitFeedback, {});
  const [, startTransition] = useTransition();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const [seen, setSeen] = useState(state);
  if (seen !== state) {
    setSeen(state);
    if (state.message) setSent(true);
  }

  function open() {
    setSent(false);
    dialogRef.current?.showModal();
  }
  function close() {
    dialogRef.current?.close();
    if (sent) {
      setRating(0);
      setMessage("");
      setSent(false);
    }
  }

  const shown = hover || rating;

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="flex h-10 items-center gap-2 rounded-lg px-2.5 text-sm text-muted hover:bg-stone-100 hover:text-ink"
        title="Donner mon avis"
      >
        <IconMessage width={18} height={18} />
        <span className="hidden sm:inline">Donner mon avis</span>
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="avis-titre"
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-line bg-white p-0 text-ink shadow-xl backdrop:bg-stone-900/40 backdrop:backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === dialogRef.current) close(); // clic sur le fond
        }}
      >
        {sent ? (
          <div className="flex flex-col items-center p-8 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-ok">
              <IconCheck />
            </span>
            <p className="mt-4 font-semibold">Merci pour ton avis !</p>
            <p className="mt-1 text-sm text-muted">Il nous aide à améliorer l&apos;application.</p>
            <Button type="button" onClick={close} className="mt-6">
              Fermer
            </Button>
          </div>
        ) : (
          <form
            noValidate
            className="flex flex-col gap-5 p-6"
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              startTransition(() => action(data));
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="avis-titre" className="text-lg font-semibold">
                  Donner mon avis
                </h2>
                <p className="text-sm text-muted">30 secondes, et ça nous aide beaucoup.</p>
              </div>
              <button type="button" onClick={close} className="rounded-lg px-2 py-1 text-muted hover:bg-stone-100" aria-label="Fermer">
                ✕
              </button>
            </div>

            {state.error && <Alert>{state.error}</Alert>}

            <fieldset>
              <legend className="text-sm font-medium">Ta note sur l&apos;application</legend>
              <div className="mt-2 flex items-center gap-1" onMouseLeave={() => setHover(0)}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <label key={n} className="cursor-pointer" onMouseEnter={() => setHover(n)}>
                    <input
                      type="radio"
                      name="rating"
                      value={n}
                      checked={rating === n}
                      onChange={() => setRating(n)}
                      className="peer sr-only"
                      aria-label={`${n} sur 5 : ${LABELS[n]}`}
                    />
                    <IconStar
                      filled={n <= shown}
                      width={34}
                      height={34}
                      className={cx(
                        "rounded-md transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-accent",
                        n <= shown ? "text-amber-400" : "text-stone-300",
                      )}
                    />
                  </label>
                ))}
                <span className="ml-2 text-sm text-muted">{shown ? LABELS[shown] : ""}</span>
              </div>
              {state.fieldErrors?.rating && rating === 0 && <p className="mt-1 text-xs text-bad">{state.fieldErrors.rating}</p>}
            </fieldset>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="avis-message" className="text-sm font-medium">
                {FEEDBACK_QUESTION}
              </label>
              <textarea
                id="avis-message"
                name="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                maxLength={2000}
                className={cx(inputClass, "h-auto py-2.5")}
                placeholder="Une fonction qui manque, quelque chose de pas clair…"
              />
              <p className="text-right text-xs text-muted">{message.length} / 2000</p>
            </div>
            <input type="hidden" name="page" value={pathname} />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={close}>
                Annuler
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Envoi…" : "Envoyer"}
              </Button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
