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
      <PageHeader
        eyebrow="About us"
        eyebrowStyle={{ fontSize: 22, fontWeight: 800, color: COLORS.accent, letterSpacing: 1.5 }}
        title="The people behind GlamourAI."
      />

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
            description="Provided invaluable guidance, continuous support, and expert mentorship throughout the development of GlamourAI, helping shape the project from concept to completion. Their insightful feedback, technical expertise, and constant encouragement played a vital role in refining our ideas, overcoming challenges, and ensuring the successful execution of the project. Their mentorship inspired innovation, strengthened our problem-solving approach, and significantly contributed to the overall quality and success of GlamourAI."
          />
        </div>

        <div>
          <SectionLabel>CO-SUPERVISOR</SectionLabel>
          <PersonCard
            name="Dr. Iqra Javed"
            role="Co-supervisor"
            detail="Department of Computer Science, UMT Lahore"
            description="Generously shared her time, knowledge, and technical expertise from a Computer Science perspective, offering thoughtful guidance and constructive feedback throughout the development of GlamourAI. Her valuable insights into system design, architecture, implementation, and problem-solving helped strengthen the project at several key stages. Through her continuous support and encouragement, she played an important role in refining our technical approach, improving the overall quality of the system, and ensuring that the project was developed with a strong, reliable, and well-structured foundation."
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
              GlamourAI is a final-year BS Artificial Intelligence project developed at the University of Management
              & Technology (UMT), Lahore, with a vision to make outfit discovery effortless, inspiring, and
              personal. Instead of switching between different apps for inspiration, shopping, designing, and
              fitting, GlamourAI brings every stage together in one intelligent experience.
              <br /><br />
              Your journey begins with our AI Fashion Stylist, which understands your event, preferences, language,
              and even the weather on your selected date to create a complete fashion plan—including outfits, shoes,
              accessories, and makeup. Once you've found your inspiration, our Recommendation System helps you
              discover products that match your vision. If you can't find exactly what you're looking for—or you'd
              rather create something truly unique—our AI Image Generation module transforms your own fabric and
              design ideas into realistic garment previews while preserving the original colors and prints.
              Finally, our Virtual Try-On technology lets you see your chosen or custom-designed outfit on yourself
              before making a decision. From the first idea to the final look, GlamourAI empowers you to create,
              personalize, and wear fashion with confidence.
            </p>
          </div>
        </div>

        <div>
          <SectionLabel>THOUGHT BEHIND THE PROJECT</SectionLabel>
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
              Fashion should be exciting, not overwhelming. Yet finding the perfect outfit often means searching
              through countless stores, gathering inspiration from different platforms, imagining how fabrics will
              look when stitched, and wondering whether the final result will suit you. GlamourAI was created to
              bring this fragmented journey into one intelligent experience. By combining AI-powered styling,
              personalized recommendations, custom garment visualization, and virtual try-on, our goal is to help
              people make confident fashion decisions with ease—saving time, reducing uncertainty, and making
              personal style more accessible to everyone.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}