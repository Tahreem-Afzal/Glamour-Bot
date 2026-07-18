import { useState } from "react";
import { COLORS } from "../styles.js";
import PageHeader from "./PageHeader.jsx";

const TEAM = [
  { name: "Zaiba Saeed", role: "Team member", detail: "BS Artificial Intelligence, final year" },
  { name: "Tahreem Afzal", role: "Team member", detail: "BS Artificial Intelligence, final year" },
  { name: "Fatima Farooq", role: "Team member", detail: "BS Artificial Intelligence, final year" },
  { name: "Hurair Ahmad", role: "Team member", detail: "BS Artificial Intelligence, final year" },
];

function SectionLabel({ children }) {
  return (
    <p
      style={{
        fontSize: 11,
        letterSpacing: 1.5,
        fontWeight: 700,
        color: COLORS.accent,
        marginBottom: 10,
      }}
    >
      {children}
    </p>
  );
}

function PersonCard({ name, role, detail, description }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        gap: 16,
        width: "100%",
        boxSizing: "border-box",
        background: COLORS.accentSoftBg,
        border: `2px solid ${COLORS.accent}`,
        borderRadius: 12,
        padding: 18,
        cursor: "default",
        transition: "transform 0.15s, box-shadow 0.15s",
        transform: hovered ? "translateY(-3px)" : "none",
        boxShadow: hovered ? "0 8px 20px rgba(194, 24, 91, 0.18)" : "none",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: COLORS.surface,
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
        <p style={{ margin: "2px 0 4px", fontSize: 12, color: COLORS.accentDark, fontWeight: 600 }}>{role}</p>
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
    <div style={{ flex: 1, width: "100%", overflowY: "auto" }}>
      <PageHeader eyebrow="About us" title="The people behind GlamourAI." />

      <div
        style={{
          padding: "0 clamp(16px, 6vw, 100px) 48px",
          width: "100%",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: 32,
        }}
      >
        <div>
          <SectionLabel>PROJECT SUPERVISOR</SectionLabel>
          <PersonCard
            name="Dr. Ashfaq Ahmad"
            role="Project supervisor"
            detail="Department of Artificial Intelligence, UMT Lahore"
            description="Provided invaluable guidance, continuous support, and expert mentorship throughout the development of GlamourAI, helping shape the project from concept to completion."
          />
        </div>

        <div>
          <SectionLabel>CO-SUPERVISOR</SectionLabel>
          <PersonCard
            name="Dr. Iqra Javed"
            role="Co-supervisor"
            detail="Department of Computer Science, UMT Lahore"
            description="Generously shared her time and technical expertise from a computer science perspective, offering valuable feedback on system design and implementation that helped strengthen the project at several key stages."
          />
        </div>

        <div>
          <SectionLabel>PROJECT TEAM</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {TEAM.map((t) => (
              <PersonCard key={t.name} {...t} />
            ))}
          </div>
        </div>

        <div>
          <SectionLabel>THE PROJECT</SectionLabel>
          <div
            style={{
              background: COLORS.accentSoftBg,
              border: `2px solid ${COLORS.accent}`,
              borderRadius: 12,
              padding: 22,
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            <p style={{ margin: 0, fontSize: 13, color: COLORS.textSecondary, lineHeight: 1.8 }}>
              GlamourAI is a final-year BS Artificial Intelligence project from the University of Management &
              Technology, Lahore, built to make outfit discovery feel effortless rather than overwhelming. At its
              core is a bilingual fashion chatbot that understands both English and Roman Urdu, so it speaks the way
              our users actually do. Alongside it sits a live-catalog recommendation engine that ranks real products
              from Pakistani brands against fit, occasion, and stated preferences instead of generic search results.
              A fabric-guided image generator lets users turn an unstitched cloth photo into a realistic finished
              garment before ever placing an order. A virtual try-on experience, powered by pose-landmark detection,
              then lets them see that outfit on themselves — measurement-based, not a flat sticker overlay. Together,
              these pieces form one weather-aware platform that makes deciding what to wear, and what to buy, faster
              and more personal.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}