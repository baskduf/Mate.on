import { Suspense } from "react";
import { AvatarDashboard } from "../../components/avatar-dashboard";

export default function MenuPage() {
  return (
    <Suspense>
      <AvatarDashboard initialScene="menu" />
    </Suspense>
  );
}
