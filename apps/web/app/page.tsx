import { Suspense } from "react";
import { AvatarDashboard } from "../components/avatar-dashboard";

export default function Home() {
  return (
    <Suspense>
      <AvatarDashboard initialScene="home" />
    </Suspense>
  );
}
