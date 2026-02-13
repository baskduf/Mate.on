import { Suspense } from "react";
import { AvatarDashboard } from "../../components/avatar-dashboard";

export default function CharacterPage() {
  return (
    <Suspense>
      <AvatarDashboard initialScene="character" />
    </Suspense>
  );
}
