export default function NotFound() {
  return (
    <main style={{ minHeight:"100vh", display:"grid", placeItems:"center", padding:24 }}>
      <section style={{ width:"min(100%, 720px)", padding:24, border:"1px solid var(--border)", borderRadius:16, background:"var(--surface)" }}>
        <h1>পাতাটি পাওয়া যায়নি</h1>
        <p>আপনি যে ঠিকানাটি খুঁজছেন সেটি উপলভ্য নয়।</p>
        <a href="/">মন্দিরের মূল পাতায় ফিরুন</a>
      </section>
    </main>
  );
}
