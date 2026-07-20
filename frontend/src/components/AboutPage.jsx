import { useState } from "react";
import { COLORS } from "../styles.js";
import PageHeader from "./PageHeader.jsx";

const TEAM = [
  { name: "Zaiba Saeed" },
  { name: "Tahreem Afzal" },
  { name: "Fatima Farooq" },
  { name: "Hurair Ahmad" },
];

const T = {
  en: {
    eyebrow: "About us",
    title: "The people behind GalmourBot.",
    supervisorLabel: "PROJECT SUPERVISOR",
    coSupervisorLabel: "CO-SUPERVISOR",
    teamLabel: "PROJECT TEAM",
    projectLabel: "THE PROJECT",
    thoughtLabel: "THOUGHT BEHIND THE PROJECT",
    teamMember: "Team member",
    teamMemberDetail: "BS Artificial Intelligence, final year",
    supervisor: {
      role: "Project supervisor",
      detail: "Department of Artificial Intelligence, UMT Lahore",
      description: "Provided invaluable guidance, continuous support, and expert mentorship throughout the development of GalmourBot, helping shape the project from concept to completion. Their insightful feedback, technical expertise, and constant encouragement played a vital role in refining our ideas, overcoming challenges, and ensuring the successful execution of the project. Their mentorship inspired innovation, strengthened our problem-solving approach, and significantly contributed to the overall quality and success of GalmourBot.",
    },
    coSupervisor: {
      role: "Co-supervisor",
      detail: "Department of Computer Science, UMT Lahore",
      description: "Generously shared her time, knowledge, and technical expertise from a Computer Science perspective, offering thoughtful guidance and constructive feedback throughout the development of GalmourBot. Her valuable insights into system design, architecture, implementation, and problem-solving helped strengthen the project at several key stages. Through her continuous support and encouragement, she played an important role in refining our technical approach, improving the overall quality of the system, and ensuring that the project was developed with a strong, reliable, and well-structured foundation.",
    },
    projectPara1: "GalmourBot is a final-year BS Artificial Intelligence project developed at the University of Management & Technology (UMT), Lahore, with a vision to make outfit discovery effortless, inspiring, and personal. Instead of switching between different apps for inspiration, shopping, designing, and fitting, GalmourBot brings every stage together in one intelligent experience.",
    projectPara2: "Your journey begins with our AI Fashion Stylist, which understands your event, preferences, language, and even the weather on your selected date to create a complete fashion plan—including outfits, shoes, accessories, and makeup. Once you've found your inspiration, our Recommendation System helps you discover products that match your vision. If you can't find exactly what you're looking for—or you'd rather create something truly unique—our AI Image Generation module transforms your own fabric and design ideas into realistic garment previews while preserving the original colors and prints. Finally, our Virtual Try-On technology lets you see your chosen or custom-designed outfit on yourself before making a decision. From the first idea to the final look, GalmourBot empowers you to create, personalize, and wear fashion with confidence.",
    thought: "Fashion should be exciting, not overwhelming. Yet finding the perfect outfit often means searching through countless stores, gathering inspiration from different platforms, imagining how fabrics will look when stitched, and wondering whether the final result will suit you. GalmourBot was created to bring this fragmented journey into one intelligent experience. By combining AI-powered styling, personalized recommendations, custom garment visualization, and virtual try-on, our goal is to help people make confident fashion decisions with ease—saving time, reducing uncertainty, and making personal style more accessible to everyone.",
  },
  ur: {
    eyebrow: "ہمارے بارے میں",
    title: "GalmourBot کے پیچھے موجود لوگ۔",
    supervisorLabel: "پروجیکٹ سپروائزر",
    coSupervisorLabel: "شریک نگران",
    teamLabel: "پروجیکٹ ٹیم",
    projectLabel: "پروجیکٹ",
    thoughtLabel: "پروجیکٹ کے پیچھے سوچ",
    teamMember: "ٹیم ممبر",
    teamMemberDetail: "بی ایس آرٹیفیشل انٹیلیجنس، آخری سال",
    supervisor: {
      role: "پروجیکٹ سپروائزر",
      detail: "شعبہ آرٹیفیشل انٹیلیجنس، یو ایم ٹی لاہور",
      description: "GalmourBot کی تیاری کے دوران انمول رہنمائی، مسلسل تعاون، اور ماہرانہ نگرانی فراہم کی، جس نے پروجیکٹ کو خیال سے تکمیل تک پہنچانے میں مدد دی۔ ان کی بصیرت افروز رائے، تکنیکی مہارت، اور مسلسل حوصلہ افزائی نے ہمارے خیالات کو نکھارنے، مشکلات پر قابو پانے، اور پروجیکٹ کی کامیاب تکمیل میں اہم کردار ادا کیا۔ ان کی رہنمائی نے جدت کو فروغ دیا، ہمارے مسئلہ حل کرنے کے انداز کو مضبوط کیا، اور GalmourBot کے مجموعی معیار اور کامیابی میں نمایاں حصہ ڈالا۔",
    },
    coSupervisor: {
      role: "شریک نگران",
      detail: "شعبہ کمپیوٹر سائنس، یو ایم ٹی لاہور",
      description: "کمپیوٹر سائنس کے نقطہ نظر سے اپنا وقت، علم اور تکنیکی مہارت فراخدلی سے فراہم کی، اور GalmourBot کی تیاری کے دوران سوچی سمجھی رہنمائی اور تعمیری رائے دی۔ سسٹم ڈیزائن، آرکیٹیکچر، عملدرآمد، اور مسئلہ حل کرنے میں ان کی قیمتی بصیرت نے کئی اہم مراحل پر پروجیکٹ کو مضبوط بنانے میں مدد کی۔ ان کی مسلسل حمایت اور حوصلہ افزائی کے ذریعے، انہوں نے ہمارے تکنیکی انداز کو نکھارنے، سسٹم کے مجموعی معیار کو بہتر بنانے، اور یہ یقینی بنانے میں اہم کردار ادا کیا کہ پروجیکٹ ایک مضبوط، قابل اعتماد، اور اچھی طرح ترتیب شدہ بنیاد کے ساتھ تیار کیا گیا۔",
    },
    projectPara1: "GalmourBot یونیورسٹی آف مینجمنٹ اینڈ ٹیکنالوجی (یو ایم ٹی)، لاہور میں تیار کیا گیا بی ایس آرٹیفیشل انٹیلیجنس کا آخری سال کا پروجیکٹ ہے، جس کا مقصد لباس کی تلاش کو آسان، متاثر کن اور ذاتی بنانا ہے۔ تحریک، خریداری، ڈیزائننگ، اور فٹنگ کے لیے مختلف ایپس کے درمیان سوئچ کرنے کے بجائے، GalmourBot ہر مرحلے کو ایک ذہین تجربے میں یکجا کرتا ہے۔",
    projectPara2: "آپ کا سفر ہمارے AI فیشن اسٹائلسٹ سے شروع ہوتا ہے، جو آپ کے موقع، ترجیحات، زبان، اور آپ کی منتخب کردہ تاریخ کے موسم کو سمجھ کر ایک مکمل فیشن پلان تیار کرتا ہے—جس میں لباس، جوتے، لوازمات، اور میک اپ شامل ہیں۔ اپنی پسند تلاش کرنے کے بعد، ہمارا تجاویز کا نظام آپ کو آپ کے وژن سے میل کھاتی مصنوعات دریافت کرنے میں مدد دیتا ہے۔ اگر آپ کو بالکل وہی چیز نہیں ملتی جو آپ چاہتے ہیں—یا آپ کچھ منفرد بنانا چاہتے ہیں—تو ہمارا AI تصویر کی تخلیق ماڈیول آپ کے اپنے کپڑے اور ڈیزائن کے خیالات کو اصل رنگوں اور پرنٹس کو برقرار رکھتے ہوئے حقیقت پسندانہ لباس کی جھلکیوں میں بدل دیتا ہے۔ آخر میں، ہماری ورچوئل ٹرائی آن ٹیکنالوجی آپ کو فیصلہ کرنے سے پہلے اپنے منتخب یا حسب ضرورت لباس کو خود پر دیکھنے دیتی ہے۔ پہلے خیال سے لے کر حتمی انداز تک، GalmourBot آپ کو اعتماد کے ساتھ فیشن تخلیق کرنے، ذاتی بنانے اور پہننے کا اختیار دیتا ہے۔",
    thought: "فیشن پرجوش ہونا چاہیے، مغلوب کن نہیں۔ پھر بھی، بہترین لباس تلاش کرنے کا مطلب اکثر بے شمار دکانوں میں تلاش کرنا، مختلف پلیٹ فارمز سے تحریک حاصل کرنا، یہ تصور کرنا کہ کپڑا سلنے کے بعد کیسا لگے گا، اور یہ سوچنا کہ آخری نتیجہ آپ پر جچے گا یا نہیں۔ GalmourBot اس بکھرے ہوئے سفر کو ایک ذہین تجربے میں یکجا کرنے کے لیے بنایا گیا۔ AI سے چلنے والی اسٹائلنگ، ذاتی تجاویز، حسب ضرورت لباس کی تصویر کشی، اور ورچوئل ٹرائی آن کو یکجا کر کے، ہمارا مقصد لوگوں کو وقت بچاتے ہوئے، غیر یقینی کو کم کرتے ہوئے، اور ذاتی انداز کو سب کے لیے قابل رسائی بناتے ہوئے، آسانی سے پراعتماد فیشن فیصلے کرنے میں مدد دینا ہے۔",
  },
};

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

export default function AboutPage({ lang = "en" }) {
  const t = T[lang];
  const isUrdu = lang === "ur";

  return (
    <div style={{ flex: 1, width: "100%", overflowY: "auto" }}>
      <PageHeader
        eyebrow={t.eyebrow}
        eyebrowStyle={{ fontSize: 22, fontWeight: 800, color: COLORS.accent, letterSpacing: 1.5 }}
        title={t.title}
      />

      <div
        dir={isUrdu ? "rtl" : "ltr"}
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
          <SectionLabel>{t.supervisorLabel}</SectionLabel>
          <PersonCard
            name="Dr. Ashfaq Ahmad"
            role={t.supervisor.role}
            detail={t.supervisor.detail}
            description={t.supervisor.description}
          />
        </div>

        <div>
          <SectionLabel>{t.coSupervisorLabel}</SectionLabel>
          <PersonCard
            name="Dr. Iqra Javed"
            role={t.coSupervisor.role}
            detail={t.coSupervisor.detail}
            description={t.coSupervisor.description}
          />
        </div>

        <div>
          <SectionLabel>{t.teamLabel}</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {TEAM.map((member) => (
              <PersonCard key={member.name} name={member.name} role={t.teamMember} detail={t.teamMemberDetail} />
            ))}
          </div>
        </div>

        <div>
          <SectionLabel>{t.projectLabel}</SectionLabel>
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
              {t.projectPara1}
              <br /><br />
              {t.projectPara2}
            </p>
          </div>
        </div>

        <div>
          <SectionLabel>{t.thoughtLabel}</SectionLabel>
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
              {t.thought}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}