export default function MaintenancePage() {
  return (
    <main className="maintenance-page">
      <div className="maintenance-card">
        <div className="temple-mark" aria-hidden="true">
          ॐ
        </div>

        <div className="status-indicator">
          <span className="status-dot" />
          <span>ওয়েবসাইট রক্ষণাবেক্ষণ চলছে</span>
        </div>

        <div
          className="maintenance-icon"
          role="img"
          aria-label="রক্ষণাবেক্ষণ চলছে"
        >
          <div className="gear gear-large">⚙</div>
          <div className="gear gear-small">⚙</div>
        </div>

        <p className="eyebrow">
          শ্রী শ্রী মা রক্ষা কালী মন্দির
        </p>

        <h1>
          ওয়েবসাইটটি বর্তমানে
          <br />
          নির্মাণ ও রক্ষণাবেক্ষণের অধীনে
        </h1>

        <p className="description">
          আমাদের মন্দিরের অফিসিয়াল ওয়েবসাইটটি যত্ন ও শ্রদ্ধার সঙ্গে
          প্রস্তুত করা হচ্ছে। বর্তমানে ওয়েবসাইটের নতুন সংস্করণের
          নির্মাণ ও প্রয়োজনীয় রক্ষণাবেক্ষণের কাজ চলছে।
        </p>

        <section className="maintenance-details" aria-label="রক্ষণাবেক্ষণের তথ্য">
          <div className="detail-item">
            <span className="detail-label">রক্ষণাবেক্ষণ শুরু</span>
            <strong>১২ সেপ্টেম্বর ২০২৬</strong>
          </div>

          <div className="detail-divider" />

          <div className="detail-item">
            <span className="detail-label">সমাপ্তির সময়সূচি</span>
            <strong>এখনও নির্ধারিত নয়</strong>
          </div>
        </section>

        <div className="loading-area" aria-label="রক্ষণাবেক্ষণ চলছে">
          <div className="loading-track">
            <div className="loading-progress" />
          </div>

          <div className="loading-label">
            <span>প্রস্তুতির কাজ চলছে</span>

            <span className="loading-dots" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </div>
        </div>

        <p className="thank-you">
          ওয়েবসাইটটি সম্পূর্ণ প্রস্তুত হলে পুনরায় চালু করা হবে।
          <br />
          আপনার ধৈর্য ও সহযোগিতার জন্য আন্তরিক ধন্যবাদ।
        </p>

        <footer>
          <span>শ্রী শ্রী মা রক্ষা কালী মন্দির</span>
          <span className="footer-separator">•</span>
          <span>সাহাপুর বটতলা মোড়</span>
        </footer>
      </div>
    </main>
  );
}
