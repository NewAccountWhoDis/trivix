import Link from "next/link";
import type { Metadata } from "next";
import { ContactSupportModal } from "@/components/support/ContactSupportModal";

export const metadata: Metadata = {
  title: "FAQ — Trivix",
  description: "Answers to common questions about playing and hosting on Trivix.",
};

type Item = { q: string; a: React.ReactNode };

const FAQS: readonly Item[] = [
  {
    q: "What is Trivix?",
    a: "Trivix is a live trivia platform. Build a team, join a game at a participating venue, and answer questions in real time from your phone.",
  },
  {
    q: "How do I play?",
    a: "Create an account, head to Play, and join the game your host has started. Questions appear on your device — lock in your answers before the timer runs out.",
  },
  {
    q: "How do I join or create a team?",
    a: "Open the Team tab once you're signed in. You can start a new team and invite friends, or join an existing one.",
  },
  {
    q: "How do I become a host?",
    a: (
      <>
        From your profile, request host access and tell us about your venue. An
        admin reviews every application and follows up for payment before your
        hosting is activated.
      </>
    ),
  },
  {
    q: "Is there a cost to host?",
    a: "Yes. After you submit a host application, an admin will review it and follow up directly with payment details.",
  },
  {
    q: "Can I add other hosts to my account?",
    a: "Yes. Note it on your host application. Sub-hosts you add inherit access to your venues and question sets.",
  },
  {
    q: "How do I update my account details?",
    a: (
      <>
        Use Edit on your profile to update your name, username, or phone. If you
        need something we don&rsquo;t expose there, reach out through Contact
        Support.
      </>
    ),
  },
  {
    q: "How do I delete my account?",
    a: "Request deletion from your profile. An admin will review and finalize the request.",
  },
];

export default function FaqPage() {
  return (
    <main className="min-h-screen px-6 py-10 md:px-12 md:py-14 max-w-2xl mx-auto">
      <Link
        href="/"
        className="text-sm text-text-muted hover:text-text-primary"
      >
        ← Back home
      </Link>
      <h1 className="font-display text-4xl md:text-5xl tracking-[3px] mb-2 mt-4">
        FAQ
      </h1>
      <p className="text-text-muted mb-8">
        Answers to the questions we hear most. Still stuck? Reach out below.
      </p>

      <div className="flex flex-col gap-3">
        {FAQS.map((item) => (
          <details
            key={item.q}
            className="group rounded-lg bg-brand-ink border border-brand-line px-5 py-4 transition open:border-brand-red/50"
          >
            <summary className="flex items-center justify-between gap-4 cursor-pointer list-none font-medium text-text-primary">
              {item.q}
              <span className="text-brand-red text-xl leading-none transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-3 text-sm text-text-muted leading-relaxed">
              {item.a}
            </p>
          </details>
        ))}
      </div>

      <p className="mt-10 text-center text-sm text-text-faint">
        Didn&rsquo;t find your answer?{" "}
        <ContactSupportModal
          trigger={
            <button
              type="button"
              className="text-brand-red underline hover:text-brand-red-glow transition"
            >
              Contact Support
            </button>
          }
        />
      </p>
    </main>
  );
}
