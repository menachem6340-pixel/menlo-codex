import { Suspense } from "react";
import { NewQuoteForm } from "./new-quote-form";

export default function NewQuotePage() {
  return (
    <Suspense fallback={<QuoteLoading />}>
      <NewQuoteForm />
    </Suspense>
  );
}

function QuoteLoading() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="rounded-xl bg-white border border-neutral-200 p-8 text-center text-neutral-600">
        טוען טופס הצעת מחיר...
      </div>
    </div>
  );
}
