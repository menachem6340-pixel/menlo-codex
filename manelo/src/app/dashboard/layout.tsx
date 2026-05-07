import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/dashboard/sidebar";
import { TopBar } from "@/components/dashboard/topbar";
import { MobileNav } from "@/components/dashboard/mobile-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, organization:organizations(*)")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen flex bg-neutral-50">
      <Sidebar profile={profile} />
      <div className="flex-1 flex flex-col">
        <TopBar profile={profile} userEmail={user.email!} />
        <main className="flex-1 p-4 pb-24 sm:p-6 sm:pb-24 lg:p-8">{children}</main>
        <MobileNav />
      </div>
    </div>
  );
}
