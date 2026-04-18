import { Bell, Menu } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { DashboardPrefetcher } from "@/components/providers/dashboard-prefetcher";
import { Button } from "@/components/ui/button";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-[#F8F6F1]">
      <DashboardPrefetcher />
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b border-[#E7E5E4] bg-white px-4 md:px-6">
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
          <div className="hidden md:block" />
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[#EF4444]" />
            </Button>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0D9488] text-xs text-white">
              JD
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto bg-[#F8F6F1] p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}



