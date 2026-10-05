import { getEdition } from "@/src/lib/edition.server";
import { StandPage } from "@/src/ui/StandPage";

export const revalidate = 60;

// /p/[paper] opens the stand with that paper already in your hands (spec 2.7).
export default async function PaperPage({ params }: PageProps<"/p/[paper]">) {
  const { paper } = await params;
  return <StandPage manifest={await getEdition()} initialHeld={paper} />;
}
