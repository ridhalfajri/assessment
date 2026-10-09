import { isAuthenticatedAdmin } from "@/lib/admin-auth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAuth = await isAuthenticatedAdmin();

  // Dapatkan URL saat ini untuk mengecualikan halaman login
  const headerList = await headers();
  const pathname = headerList.get("x-invoke-path") || "";
  const isLoginPage = pathname === "/admin/login";

  if (!isAuth && !isLoginPage) {
    // Biarkan halaman login sendiri yang merender jika belum login
    // Namun jika akses rute admin lain, redirect ke login
    // Catatan: route /admin/login di app router dipisah atau dicek
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex">
      {isAuth ? (
        <>
          <AdminSidebar />
          <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
            <header className="h-16 border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-30">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  ● Admin Online
                </span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400 hidden sm:inline">
                  • Monitoring Eksperimen Akuntansi &amp; Pajak
                </span>
              </div>
              <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                Data terenkripsi &amp; terlindungi RLS
              </div>
            </header>
            <main className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto">{children}</main>
          </div>
        </>
      ) : (
        <div className="flex-1">{children}</div>
      )}
    </div>
  );
}
