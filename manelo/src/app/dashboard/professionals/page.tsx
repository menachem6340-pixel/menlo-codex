import { HardHat } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export default function ProfessionalsPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader title="בעלי מקצוע" description="חשמלאים, אינסטלטורים, טייחים..." />
      <EmptyState
        icon={HardHat}
        title="בקרוב - שלב 3"
        description="מאגר בעלי מקצוע עם פילטר לפי אזור, מקצוע ודירוג - יתווסף בשלב 3"
      />
    </div>
  );
}
