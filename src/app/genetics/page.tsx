import Link from "next/link";
import { PageHeader, StatCard, Card, CardHeader, Badge } from "@/components/ui";
import { Icon } from "@/components/icons";
import { cattle, getCattle, canBeDam, canBeSire, isFemaleClass } from "@/lib/data";
import { ageFrom } from "@/lib/format";

function AnimalPill({ id }: { id: string }) {
  const a = getCattle(id);
  if (!a) return <span className="text-xs text-muted">{id}</span>;
  return (
    <Link
      href={`/cattle/${a.id}`}
      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-canvas px-3 py-1 text-xs font-medium text-ink transition hover:border-brand-300 hover:text-brand-700"
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isFemaleClass(a.class) ? "bg-violet-400" : "bg-sky-400"}`} />
      {a.name} <span className="text-muted">({a.id})</span>
    </Link>
  );
}

export default function GeneticsPage() {
  // Sires that have produced offspring within the registry.
  const sires = cattle.filter((c) => canBeSire(c.class));
  const dams = cattle.filter((c) => canBeDam(c.class) && cattle.some((o) => o.damId === c.id));

  const breeds = Array.from(new Set(cattle.map((c) => c.breed)));

  return (
    <>
      <PageHeader
        title="Genetics & Lineage"
        description="Sire & dam lines, progeny tracking and breed composition."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active Sires" value={String(sires.length)} iconName="dna" tone="blue" />
        <StatCard label="Producing Dams" value={String(dams.length)} iconName="cow" tone="purple" />
        <StatCard label="Distinct Breeds" value={String(breeds.length)} iconName="analytics" tone="green" />
        <StatCard label="Registered Animals" value={String(cattle.length)} iconName="report" tone="green" />
      </div>

      <Card className="mt-6">
        <CardHeader title="Sire Lines (Progeny by Bull)" />
        <div className="divide-y divide-line">
          {sires.map((s) => {
            const progeny = cattle.filter((c) => c.sireId === s.id);
            return (
              <div key={s.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-sky-100 text-sky-700">
                    <Icon.dna width={20} height={20} />
                  </div>
                  <div>
                    <Link href={`/cattle/${s.id}`} className="text-sm font-semibold text-ink hover:text-brand-700">
                      {s.name} ({s.id})
                    </Link>
                    <p className="text-xs text-muted">{s.breed} · {ageFrom(s.dob)}</p>
                  </div>
                  <Badge tone="gray">{progeny.length} offspring</Badge>
                </div>
                {progeny.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2 pl-13">
                    {progeny.map((p) => (
                      <AnimalPill key={p.id} id={p.id} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="mt-6">
        <CardHeader title="Dam Lines (Maternal Families)" />
        <div className="divide-y divide-line">
          {dams.map((d) => {
            const offspring = cattle.filter((c) => c.damId === d.id);
            return (
              <div key={d.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3 sm:w-64">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-violet-100 text-violet-700">
                    <Icon.cow width={20} height={20} />
                  </div>
                  <div>
                    <Link href={`/cattle/${d.id}`} className="text-sm font-semibold text-ink hover:text-brand-700">
                      {d.name} ({d.id})
                    </Link>
                    <p className="text-xs text-muted">{d.breed}</p>
                  </div>
                </div>
                <div className="flex flex-1 flex-wrap items-center gap-2">
                  <Icon.swap width={16} height={16} className="text-muted" />
                  {offspring.map((o) => (
                    <AnimalPill key={o.id} id={o.id} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </>
  );
}
