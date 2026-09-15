export default function Loading() {
  return (
    <main aria-busy="true" aria-live="polite" style={{ minHeight:"100vh", display:"grid", placeItems:"center", padding:24 }}>
      <p>লোড হচ্ছে…</p>
    </main>
  );
}
