import AdminSessionProvider from "@/app/admin/_components/session-provider";

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  return <AdminSessionProvider>{children}</AdminSessionProvider>;
}
