import { AuthShell } from "@/components/auth/auth-page";
import { AuthCardSkeleton } from "@/components/skeletons/support-skeletons";

export default function Loading() {
  return (
    <AuthShell>
      <AuthCardSkeleton />
    </AuthShell>
  );
}
