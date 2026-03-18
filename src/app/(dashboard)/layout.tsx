import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="sticky top-0 z-20 flex h-16 items-center border-b border-border/70 bg-background/80 px-4 backdrop-blur">
            <SidebarTrigger className="mr-4" />
            <div className="flex flex-col">
              <span className="text-lg font-semibold tracking-tight text-foreground">
                Review AI
              </span>
              <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Reputation workflow for busy operators
              </span>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
