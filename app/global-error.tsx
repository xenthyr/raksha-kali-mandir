"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="bn-IN">
      <body style={{ margin:0, background:"#171310", color:"#f8efe5", fontFamily:"system-ui, sans-serif" }}>
        <main role="alert" style={{ minHeight:"100vh", display:"grid", placeItems:"center", padding:24 }}>
          <section style={{ width:"min(100%, 720px)" }}>
            <h1>মন্দিরের ওয়েবসাইটে সাময়িক সমস্যা হয়েছে</h1>
            <p>আবার চেষ্টা করুন। সমস্যা চলতে থাকলে পরে পুনরায় দেখুন।</p>
            <button type="button" onClick={reset}>আবার চেষ্টা করুন</button>
          </section>
        </main>
      </body>
    </html>
  );
}
