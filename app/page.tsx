import { getEdition } from "@/src/lib/edition.server";
import { StandPage } from "@/src/ui/StandPage";

export const revalidate = 60;

export default async function Home() {
  return <StandPage manifest={await getEdition()} />;
}
