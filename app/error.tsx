"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main role="alert" style={{ minHeight:"100vh", display:"grid", placeItems:"center", padding:24 }}>
      <section style={{ width:"min(100%, 720px)", padding:24, border:"1px solid var(--border)", borderRadius:16, background:"var(--surface)" }}>
        <h1>সাময়িক সমস্যা হয়েছে</h1>
        <p>পাতাটি এই মুহূর্তে সম্পূর্ণভাবে লোড করা যায়নি। আবার চেষ্টা করুন।</p>
        <button type="button" onClick={reset}>আবার চেষ্টা করুন</button>
      </section>
    </main>
  );
}
