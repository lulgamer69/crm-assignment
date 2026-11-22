import { Link } from "react-router-dom";

function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 48 48" aria-hidden="true">
      <path d="M8 31C12 16 23 6 38 6c-8 6-13 14-16 23-2 6-7 10-14 12 1-3 1-6 0-10Z" fill="currentColor" />
      <path d="M21 36c4-11 12-18 23-20-5 5-8 10-10 16-2 5-6 8-13 10 1-2 1-4 0-6Z" fill="#fff" />
    </svg>
  );
}

function LaptopIllustration() {
  return (
    <div className="login-illustration" aria-hidden="true">
      <svg viewBox="0 0 620 390" role="presentation">
        <defs>
          <linearGradient id="screen" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#dceaff" />
            <stop offset="1" stopColor="#9bb8e7" />
          </linearGradient>
          <linearGradient id="laptop" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#d9e6ff" />
            <stop offset="1" stopColor="#7797c8" />
          </linearGradient>
        </defs>
        <path d="m93 63 394 40 28 228-398-25L93 63Z" fill="#071a38" stroke="#93b4e9" strokeWidth="10" />
        <path d="m111 80 357 36 22 192-360-23-19-205Z" fill="url(#screen)" />
        <path d="m114 84 355 35 4 29-356-35-3-29Z" fill="#102a51" />
        <circle cx="129" cy="99" r="4" fill="#6ea8ff" />
        <text x="141" y="103" fill="#fff" fontSize="9" fontFamily="Arial">LeadFlow CRM</text>
        <rect x="125" y="128" width="62" height="135" rx="5" fill="#17345e" />
        <text x="137" y="151" fill="#cfe0ff" fontSize="8" fontFamily="Arial">Dashboard</text>
        <text x="137" y="174" fill="#cfe0ff" fontSize="8" fontFamily="Arial">Leads</text>
        <text x="137" y="197" fill="#cfe0ff" fontSize="8" fontFamily="Arial">Reports</text>
        <rect x="196" y="139" width="121" height="65" rx="7" fill="#f7faff" />
        <text x="207" y="154" fill="#526987" fontSize="8" fontFamily="Arial">Lead conversion</text>
        <circle cx="257" cy="177" r="18" fill="none" stroke="#5d8fd8" strokeWidth="8" strokeDasharray="85 28" transform="rotate(-90 257 177)" />
        <rect x="326" y="142" width="144" height="62" rx="7" fill="#f7faff" />
        <text x="338" y="157" fill="#526987" fontSize="8" fontFamily="Arial">Monthly activity</text>
        <path d="m340 188 24-13 23 7 21-20 20 6 28-16" fill="none" stroke="#4a83d0" strokeWidth="4" />
        <rect x="198" y="213" width="272" height="52" rx="7" fill="#f7faff" />
        <text x="210" y="229" fill="#526987" fontSize="8" fontFamily="Arial">Recent leads</text>
        <circle cx="215" cy="243" r="5" fill="#4a83d0" />
        <path d="M229 243h95m-95 9h68" stroke="#9fb1ca" strokeWidth="4" strokeLinecap="round" />
        <path d="m68 317 448 26 49 23c5 3 4 10-3 11H92c-14 0-26-5-35-14l-16-16c-5-5-1-13 7-12l20 2Z" fill="url(#laptop)" stroke="#9db9e8" strokeWidth="4" />
        <path d="m117 329 369 21" stroke="#496a9a" strokeWidth="3" />
        <path d="m256 339 96 6" stroke="#496a9a" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export default function AuthBrandPanel() {
  return (
    <aside className="login-brand-panel">
      <Link className="brand-lockup" to="/login" aria-label="LeadFlow CRM home">
        <BrandMark />
        <span>LeadFlow CRM</span>
      </Link>

      <div className="brand-copy">
        <h1>Manage Leads.<br />Close More Deals.</h1>
        <p>A simple CRM to track, manage and convert your leads efficiently.</p>
      </div>
      <LaptopIllustration />
      <div className="brand-wave brand-wave-one" />
      <div className="brand-wave brand-wave-two" />
    </aside>
  );
}
