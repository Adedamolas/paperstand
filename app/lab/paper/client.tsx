"use client";

import dynamic from "next/dynamic";

// leva, three and the paper simulation stay out of every other route's bundle.
const PaperLab = dynamic(() => import("@/src/scene/paper/PaperLab"), { ssr: false });

export function LabPaperClient() {
  return <PaperLab />;
}
