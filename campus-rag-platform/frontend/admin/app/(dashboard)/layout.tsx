import Sidebar from "@/components/sidebar";
import AdminHeader from "@/components/admin-header";

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />
      <main className="flex-1 bg-slate-950 p-6 md:p-8">
        <AdminHeader />
        {children}
      </main>
    </div>
  );
}