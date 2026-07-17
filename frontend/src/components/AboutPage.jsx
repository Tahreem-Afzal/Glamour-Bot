import { COLORS } from "../styles.js";
import PageHeader from "./PageHeader.jsx";

const TEAM = [
  { name: "Zaiba Saeed", role: "Team member", detail: "BS Artificial Intelligence, final year" },
  { name: "Tahreem Afzal", role: "Team member", detail: "BS Artificial Intelligence, final year" },
  { name: "Fatima Farooq", role: "Team member", detail: "BS Artificial Intelligence, final year" },
  { name: "Hurair Ahmad", role: "Team member", detail: "BS Artificial Intelligence, final year" },
];

function PersonCard({ name, role, detail, description }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 16,
        background: COLORS.surfaceAlt,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12,
        padding: 18,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: COLORS.accentSoftBg,
          color: COLORS.accent,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
        }}
      >
        👤
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: COLORS.textPrimary }}>{name}</p>
        <p style={{ margin: "2px 0 4px", fontSize: 12, color: COLORS.accent }}>{role}</p>
        <p style={{ margin: 0, fontSize: 12, color: COLORS.textSecondary }}>{detail}</p>
        {description && (
          <p style={{ margin: "8px 0 0", fontSize: 13, color: COLORS.textSecondary, lineHeight: 1.6 }}>
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

export default function AboutPage() {
  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      <PageHeader
        eyebrow="About us"
        title="The people behind GlamourAI."
        subtitle="A final year project from the BS Artificial Intelligence program, University of Management & Technology, Lahore."
      />

      <div style={{ padding: "0 40px 48px", display: "flex", flexDirection: "column", gap: 32, maxWidth: 720 }}>
        <div>
          <p style={{ fontSize: 11, letterSpacing: 1.5, color: COLORS.textMuted, marginBottom: 10 }}>
            PROJECT SUPERVISOR
          </p>
          <PersonCard
            name="Dr. Ashfaq Ahmad"
            role="Project supervisor"
            detail="Department of Artificial Intelligence, UMT Lahore"
            description="Provided invaluable guidance, continuous support, and expert mentorship throughout the development of GlamourAI, helping shape the project from concept to completion."
          />
        </div>

        <div>
          <p style={{ fontSize: 11, letterSpacing: 1.5, color: COLORS.textMuted, marginBottom: 10 }}>
            PROJECT TEAM
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {TEAM.map((t) => (
              <PersonCard key={t.name} {...t} />
            ))}
          </div>
        </div>

        <div>
          <p style={{ fontSize: 11, letterSpacing: 1.5, color: COLORS.textMuted, marginBottom: 10 }}>
            THE PROJECT
          </p>
          <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 20 }}>
            <p style={{ margin: 0, fontSize: 13, color: COLORS.textSecondary, lineHeight: 1.7 }}>
              GlamourAI combines a bilingual fashion chatbot, a live-catalog recommendation engine, a fabric-guided
              image generator, and a virtual try-on experience into one platform — built to make outfit discovery
              and decision-making faster, more personal, and weather-aware.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}