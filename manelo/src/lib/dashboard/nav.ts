import {
  Briefcase,
  Calculator,
  ClipboardList,
  FileText,
  FolderOpen,
  HardHat,
  Home,
  LayoutDashboard,
  ListTodo,
  Settings,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface DashboardNavItem {
  href: string;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
}

export const dashboardNavItems: DashboardNavItem[] = [
  {
    href: "/dashboard",
    label: "ראשי",
    shortLabel: "ראשי",
    description: "תמונת מצב יומית",
    icon: LayoutDashboard,
  },
  {
    href: "/dashboard/projects",
    label: "פרויקטים",
    shortLabel: "פרויקטים",
    description: "כל הפרויקטים והמרכזים שלהם",
    icon: Briefcase,
  },
  {
    href: "/dashboard/plans",
    label: "ניתוח תכניות",
    shortLabel: "תכניות",
    description: "העלאה, ניתוח AI ובדיקת תכניות",
    icon: FileText,
  },
  {
    href: "/dashboard/boq",
    label: "כתבי כמויות",
    shortLabel: "כמויות",
    description: "כתבי כמויות, ייבוא וחיבור להצעות",
    icon: ClipboardList,
  },
  {
    href: "/dashboard/quotes",
    label: "הצעות מחיר",
    shortLabel: "הצעות",
    description: "הצעות מחיר, PDF ושליחה ללקוח",
    icon: Calculator,
  },
  {
    href: "/dashboard/tasks",
    label: "משימות",
    shortLabel: "משימות",
    description: "ביצוע, אחראים, סטטוסים ותמונות",
    icon: ListTodo,
  },
  {
    href: "/dashboard/clients",
    label: "לקוחות",
    shortLabel: "לקוחות",
    description: "לקוחות, פרטים והיסטוריה",
    icon: Users,
  },
  {
    href: "/dashboard/professionals",
    label: "בעלי מקצוע",
    shortLabel: "מקצוע",
    description: "גורמים מטפלים, טלפונים ותחומים",
    icon: HardHat,
  },
  {
    href: "/dashboard/suppliers",
    label: "ספקים",
    shortLabel: "ספקים",
    description: "ספקים, מחירים והזמנות עתידיות",
    icon: Truck,
  },
  {
    href: "/dashboard/drive",
    label: "Google Drive",
    shortLabel: "Drive",
    description: "סנכרון תיקיות וקבצי פרויקט",
    icon: FolderOpen,
  },
  {
    href: "/dashboard/settings",
    label: "הגדרות",
    shortLabel: "הגדרות",
    description: "עסק, משתמשים והגדרות מערכת",
    icon: Settings,
  },
];

export const mobileBottomNavItems = [
  {
    href: "/dashboard",
    label: "ראשי",
    icon: Home,
  },
  {
    href: "/dashboard/projects",
    label: "פרויקטים",
    icon: Briefcase,
  },
  {
    href: "/dashboard/boq",
    label: "כמויות",
    icon: ClipboardList,
  },
  {
    href: "/dashboard/quotes",
    label: "הצעות",
    icon: Calculator,
  },
  {
    href: "/dashboard/tasks",
    label: "משימות",
    icon: ListTodo,
  },
];
