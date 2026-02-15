import { Suspense } from "react";
import { SquareContainer } from "../../components/square/square-container";

export default function SquarePage() {
  return (
    <Suspense>
      <SquareContainer />
    </Suspense>
  );
}
