import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      id: "super-admin",
      name: "Super Admin",
      credentials: { email: { type: "email" }, password: { type: "password" } },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const admin = await prisma.superAdmin.findFirst({ where: { email: { equals: credentials.email.trim(), mode: "insensitive" } } });
        if (!admin) return null;
        const valid = await bcrypt.compare(credentials.password, admin.password);
        if (!valid) return null;
        return { id: admin.id, email: admin.email, role: "super_admin" };
      },
    }),
    CredentialsProvider({
      id: "vendor",
      name: "Vendor",
      credentials: { email: { type: "email" }, password: { type: "password" } },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const vendor = await prisma.vendor.findFirst({ where: { contactEmail: { equals: credentials.email.trim(), mode: "insensitive" } } });
        if (!vendor || !vendor.isActive) return null;
        const valid = await bcrypt.compare(credentials.password, vendor.password);
        if (!valid) return null;
        return { id: vendor.id, email: vendor.contactEmail, role: "vendor", name: vendor.name };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
      }
      return session;
    },
  },
  pages: {
    signIn: "/admin/login",
  },
};
