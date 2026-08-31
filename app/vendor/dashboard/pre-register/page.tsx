import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import Link from "next/link";
import PreRegisterForm from "./_form";

export default async function PreRegisterPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "vendor") redirect("/vendor/login");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Pre-register a client</h1>
          <p className="text-xs text-gray-500 mt-0.5">Office registration before delivery — tag is linked before it leaves the office</p>
        </div>
        <Link
          href="/vendor/dashboard"
          className="text-sm text-gray-500 hover:text-gray-700 font-medium"
        >
          ← Back to dashboard
        </Link>
      </header>
      <div className="px-4 pb-12">
        <PreRegisterForm />
      </div>
    </div>
  );
}
