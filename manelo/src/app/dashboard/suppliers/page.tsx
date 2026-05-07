import { Truck } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export default function SuppliersPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader title="ספקים" description="ניהול ספקים והשוואת מחירים" />
      <EmptyState
        icon={Truck}
        title="בקרוב - שלב 3"
        description="ניהול ספקים, הזמנות, השוואת מחירים אוטומטית - יתווסף בשלב 3 של הפיתוח"
      />
    </div>
  );
}
