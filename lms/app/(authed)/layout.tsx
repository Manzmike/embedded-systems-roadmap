import { AppShell } from "@/components/AppShell";
import { NotificationsPoller } from "@/components/NotificationsPoller";
import { requireUser } from "@/lib/auth";

export default async function AuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();
  return (
    <AppShell>
      {children}
      <NotificationsPoller />
    </AppShell>
  );
}
