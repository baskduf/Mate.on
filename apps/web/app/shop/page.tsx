import { Suspense } from "react";
import { AvatarDashboard } from "../../components/avatar-dashboard";

export default function ShopPage() {
  return (
    <Suspense>
      <AvatarDashboard initialScene="shop" />
    </Suspense>
  );
}
