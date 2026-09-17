import { getTernaryAccess } from "@/lib/ternary-access";
import { TernaryLab } from "@/components/ternary/ternary-lab";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Ternary Beta" };

export default async function TernaryPage() {
  // Fail-closed server gate: no session / RPC absent → false → denied view.
  const allowed = await getTernaryAccess();

  if (!allowed) {
    // Neutral denial (§9): reveals nothing about grants, flags, roles, or why.
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-4">
        <Card className="max-w-md text-center">
          <CardHeader>
            <CardTitle>Ternary Beta</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            Experimental access required — This simulator is currently
            restricted to authorized AXIOM Beta users.
          </CardContent>
        </Card>
      </main>
    );
  }

  return <TernaryLab />;
}
