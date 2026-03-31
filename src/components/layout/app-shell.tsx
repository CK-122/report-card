
"use client";

import { 
  SidebarProvider, 
  Sidebar, 
  SidebarContent, 
  SidebarHeader, 
  SidebarFooter, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton, 
  SidebarInset,
  SidebarTrigger
} from "@/components/ui/sidebar";
import { 
  LayoutDashboard,
  Settings2,
  FileText,
  Users,
  FileSearch,
  Download
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar className="border-r border-border">
          <SidebarHeader className="p-4 flex items-center gap-2">
            <div className="size-8 rounded bg-primary flex items-center justify-center text-primary-foreground font-black text-xs">
              CK
            </div>
            <h1 className="text-xl font-black tracking-tight text-primary uppercase leading-none">Marksheet<br/>Pro</h1>
          </SidebarHeader>
          <SidebarContent className="px-2 py-4">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/"}>
                  <Link href="/" className="flex items-center gap-3">
                    <LayoutDashboard className="size-5" />
                    <span className="font-bold uppercase text-[10px] tracking-widest">Generator</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/students"}>
                  <Link href="/students" className="flex items-center gap-3">
                    <Users className="size-5" />
                    <span className="font-bold uppercase text-[10px] tracking-widest">Students</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/reports"}>
                  <Link href="/reports" className="flex items-center gap-3">
                    <FileSearch className="size-5" />
                    <span className="font-bold uppercase text-[10px] tracking-widest">Reports</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/export"}>
                  <Link href="/export" className="flex items-center gap-3">
                    <Download className="size-5" />
                    <span className="font-bold uppercase text-[10px] tracking-widest">Export</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/templates"}>
                  <Link href="/templates" className="flex items-center gap-3">
                    <Settings2 className="size-5" />
                    <span className="font-bold uppercase text-[10px] tracking-widest">Templates</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-6 mt-auto">
            <div className="text-[9px] text-muted-foreground text-center font-bold tracking-widest uppercase opacity-50">
              Session 2025-26
            </div>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex flex-col flex-1 bg-background">
          <header className="h-16 border-b border-border bg-card flex items-center px-6 gap-4 sticky top-0 z-50">
            <SidebarTrigger />
            <div className="flex-1" />
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-secondary px-2 py-1 rounded">Institutional Portal</span>
            </div>
          </header>
          <main className="flex-1 p-6 lg:p-10">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
