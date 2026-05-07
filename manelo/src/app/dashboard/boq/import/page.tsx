import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { ArrowRight } from "lucide-react";
import { BoqImportForm } from "./boq-import-form";

export default async function BoqImportPage() {
  const supabase = await createClient();
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, client:contacts(name)")
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="ייבוא כתב כמויות"
        description="ייבוא קבצי דקל או בינארית לקובץ כתב כמויות במערכת"
        action={
          <Link href="/dashboard/boq">
            <Button variant="outline" size="sm">
              <ArrowRight className="h-4 w-4" />
              חזרה לכתבי כמויות
            </Button>
          </Link>
        }
      />

      <BoqImportForm
        projects={(projects || []).map((project) => {
          const client = firstRelation<{ name: string }>(project.client);
          return {
            id: project.id,
            name: project.name,
            client_name: client?.name || "",
          };
        })}
      />
    </div>
  );
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}
