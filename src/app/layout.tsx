import type { Metadata } from "next";
import { ExperimentProvider } from "@/context/ExperimentContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "Simulasi Studi Kasus Daring",
  description:
    "Aplikasi eksperimen pengambilan keputusan pajak: simulasi studi kasus daring dengan timer global dan pencatatan durasi pencarian informasi.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <ExperimentProvider>{children}</ExperimentProvider>
      </body>
    </html>
  );
}
