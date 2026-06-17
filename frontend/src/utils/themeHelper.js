/**
 * Professional Dark Theme System for the student and teacher dashboards.
 * The palette leans toward deep navy surfaces, bright blue accents, and
 * subtle glassmorphism so the pages feel more advanced without becoming noisy.
 */

export const getThemeClasses = () => ({
  // Core layout
  mainContainer: "min-h-screen bg-[#081120] text-[#E5EEF9]",
  wrapper: "bg-[#081120]",
  loadingBg: "bg-[#081120]",
  loadingText: "text-[#E5EEF9]",
  gradientBg:
    "bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_36%),radial-gradient(circle_at_85%_15%,_rgba(124,58,237,0.16),_transparent_30%),radial-gradient(circle_at_50%_110%,_rgba(6,182,212,0.10),_transparent_34%),linear-gradient(180deg,_#0F1B31_0%,_#081120_100%)]",
  backgroundGradient:
    "bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_36%),linear-gradient(180deg,_#0F1B31_0%,_#081120_100%)]",

  // Header
  header:
    "border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-[0_24px_80px_rgba(0,0,0,0.35)]",
  headerStroke: "bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#06B6D4]",
  headerInner:
    "border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.95),rgba(30,41,59,0.82))]",
  headerText: "text-[#F8FBFF]",
  headerSubtext: "text-[#CBD5E1]",
  headerTitle: "text-[#F8FBFF]",
  headerSubtitle: "text-[#CBD5E1]",
  headerLabel: "text-[#93C5FD]",

  // Cards and surfaces
  card: "border-white/10 bg-white/[0.04]",
  cardHover: "hover:border-white/20 hover:bg-white/[0.06]",
  cardDark: "border-white/10 bg-[#0B1425]/90",
  cardSurface: "bg-[#101B31]",
  statCard:
    "border-white/10 bg-white/[0.05] p-4 shadow-lg shadow-slate-950/20 backdrop-blur-xl border-l-4 border-l-[#2563EB]",
  statLabel: "text-xs text-[#94A3B8] uppercase tracking-[0.22em]",
  statValue: "text-[#F8FBFF]",
  cardLabel: "text-[#CBD5E1]",
  cardValue: "text-[#F8FBFF]",

  // Text
  text: {
    primary: "text-[#F8FBFF]",
    secondary: "text-[#CBD5E1]",
    tertiary: "text-[#94A3B8]",
    muted: "text-[#64748B]",
    inverse: "text-[#081120]",
  },
  textPrimary: "text-[#F8FBFF]",
  textSecondary: "text-[#CBD5E1]",
  textTertiary: "text-[#94A3B8]",
  textInverse: "text-[#081120]",

  // Buttons
  button: {
    primary:
      "border-[#2563EB]/40 bg-[#2563EB] text-white hover:bg-[#1D4ED8] shadow-lg shadow-[#2563EB]/40",
    secondary:
      "border-white/10 bg-white/[0.04] text-[#F8FBFF] hover:bg-white/[0.08]",
    ghost: "text-[#CBD5E1] hover:bg-white/[0.05]",
    danger:
      "border-[#DC2626]/40 bg-[#DC2626] text-white hover:bg-[#B91C1C] shadow-lg shadow-[#DC2626]/25",
    success:
      "border-[#10B981]/40 bg-[#10B981] text-white hover:bg-[#059669] shadow-lg shadow-[#10B981]/25",
    warning:
      "border-[#F59E0B]/40 bg-[#F59E0B] text-[#081120] hover:bg-[#D97706] shadow-lg shadow-[#F59E0B]/25",
  },
  buttonPrimary:
    "border-[#2563EB]/40 bg-[#2563EB] text-white hover:bg-[#1D4ED8] shadow-lg shadow-[#2563EB]/40",
  buttonTheme:
    "border-[#2563EB]/30 bg-[#1E40AF]/20 text-[#BFDBFE] hover:bg-[#2563EB]/30",
  buttonDanger:
    "border-[#DC2626]/30 bg-[#7F1D1D]/50 text-[#FCA5A5] hover:bg-[#991B1B]/70",
  buttonSuccess:
    "border-[#10B981]/30 bg-[#064E3B]/50 text-[#A7F3D0] hover:bg-[#10B981]/20",
  buttonSecondary:
    "border-white/10 bg-white/[0.04] text-[#CBD5E1] hover:bg-white/[0.08]",

  // Badges
  badge: "border-white/10 bg-white/[0.04] text-[#CBD5E1]",
  badgePrimary: "border-[#2563EB]/40 bg-[#1E40AF]/30 text-[#BFDBFE]",
  badgeSecondary: "border-[#7C3AED]/40 bg-[#5B21B6]/30 text-[#E9D5FF]",
  badgeSuccess: "border-[#10B981]/40 bg-[#064E3B]/30 text-[#A7F3D0]",
  badgeWarning: "border-[#F59E0B]/40 bg-[#78350F]/30 text-[#FCD34D]",
  badgeDanger: "border-[#DC2626]/40 bg-[#7F1D1D]/30 text-[#FCA5A5]",
  badgeInfo: "border-[#2563EB]/40 bg-[#1E40AF]/30 text-[#BFDBFE]",

  // Inputs and forms
  input:
    "border-white/10 bg-white/[0.04] text-[#F8FBFF] placeholder:text-[#64748B] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/50 focus:bg-white/[0.06]",
  inputDisabled: "border-white/10 bg-[#09111F] text-[#64748B] cursor-not-allowed",

  // Modals and dialogs
  modal: "border-white/10 bg-[#0D172A]/95 backdrop-blur-xl",
  modalOverlay: "bg-[#020617]/60 backdrop-blur-sm",

  // Sidebar and nav
  sidebar: "border-white/10 bg-white/[0.04]",
  sidebarItem:
    "border-white/10 text-[#CBD5E1] hover:border-[#2563EB]/40 hover:bg-white/[0.06]",
  sidebarItemActive: "border-[#2563EB]/60 bg-[#2563EB]/20 text-[#BFDBFE]",

  // Borders and dividers
  divider: "divide-white/10",
  border: "border-white/10",
  borderSubtle: "border-white/[0.06]",
  borderAccent: "border-[#2563EB]",
  dividerSubtle: "divide-white/[0.06]",

  // Shadows
  shadow: "shadow-[0_18px_50px_rgba(0,0,0,0.35)]",
  shadowLg: "shadow-[0_28px_70px_rgba(0,0,0,0.45)]",
  shadowMd: "shadow-[0_10px_20px_rgba(0,0,0,0.25)]",

  // Status colors
  status: {
    success: "text-[#A7F3D0] border-[#10B981]/40 bg-[#064E3B]/30",
    warning: "text-[#FCD34D] border-[#F59E0B]/40 bg-[#78350F]/30",
    error: "text-[#FCA5A5] border-[#DC2626]/40 bg-[#7F1D1D]/30",
    info: "text-[#BFDBFE] border-[#2563EB]/40 bg-[#1E40AF]/30",
  },

  // Accents
  primary: "#2563EB",
  primaryLight: "#1E40AF",
  secondary: "#7C3AED",
  secondaryLight: "#6D28D9",

  // Tabs
  tabActive: "text-[#BFDBFE] border-b-2 border-[#2563EB]",
  tabInactive: "text-[#94A3B8] hover:text-[#CBD5E1]",

  // Gradients
  gradientPrimary: "from-[#2563EB] to-[#1D4ED8]",
  gradientSecondary: "from-[#7C3AED] to-[#6D28D9]",
  gradientDanger: "from-[#DC2626] to-[#991B1B]",

  // Layered surfaces
  layer1: "bg-[#081120] border-white/10",
  layer2: "bg-[#101B31] border-white/10",
  layer3: "bg-[#15223A] border-white/10",
  layer4: "bg-[#1B2B47] border-white/10",

  // Student dashboard specific
  mobileOverviewCard:
    "border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.95),rgba(16,27,49,0.82))] shadow-[0_24px_60px_rgba(2,6,23,0.45)] backdrop-blur-xl",
  mobileOverviewLabel: "text-[#93C5FD]",
  mobileOverviewTitle: "text-[#F8FBFF]",
  mobileOverviewDivide: "divide-white/10",
  mobileOverviewStatEmerald: "text-[#34D399]",
  mobileOverviewStatCyan: "text-[#67E8F9]",
  mobileOverviewStatOrange: "text-[#FBBF24]",
  mobileOverviewStatFuchsia: "text-[#E879F9]",
  mobileOverviewStatMuted: "text-[#94A3B8]",
  desktopOverviewCard:
    "border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(16,27,49,0.84))] shadow-[0_30px_80px_rgba(2,6,23,0.45)] backdrop-blur-xl",
  desktopOverviewLabel: "text-[#93C5FD]",
  desktopOverviewTitle: "text-[#F8FBFF]",
  desktopOverviewDesc: "text-[#CBD5E1]",
  overviewStatCard: "border-white/10 bg-white/[0.05] shadow-lg shadow-slate-950/20",
  overviewStatLabel: "text-[#94A3B8]",
  overviewStatNum: "text-[#F8FBFF]",
  overviewStatDesc: "text-[#CBD5E1]",
  mobileRepCard:
    "border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.95),rgba(16,27,49,0.84))] shadow-[0_24px_60px_rgba(2,6,23,0.45)] backdrop-blur-xl",
  mobileRepLabel: "text-[#93C5FD]",
  mobileRepTitle: "text-[#F8FBFF]",
  mobileRepBadge: "border-white/10 bg-white/[0.05] text-[#CBD5E1]",
  mobileRepItem: "border-white/10 bg-white/[0.04]",
  mobileRepName: "text-[#F8FBFF]",
  mobileRepEmail: "text-[#CBD5E1]",
  mobileRepCall: "text-[#93C5FD]",
});

