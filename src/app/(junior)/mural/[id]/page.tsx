import { MuralReader } from "@/components/junior/mural-reader";

export const metadata = {
  title: "Mural · Andaime",
};

export default async function MuralBookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="relative w-full max-w-[1200px] mx-auto px-6 lg:px-10 pb-16 pt-2">
      <MuralReader id={id} />
    </div>
  );
}
