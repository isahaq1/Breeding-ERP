import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardHeader, Table, Th, Td, StatusBadge, Badge, EmptyRow } from "@/components/ui";
import { Icon } from "@/components/icons";
import {
  cattle,
  getCattle,
  cattleLabel,
  breedingRecords,
  birthRecords,
  vaccinations,
  healthRecords,
} from "@/lib/data";
import { formatDate, ageFrom } from "@/lib/format";

export function generateStaticParams() {
  return cattle.map((c) => ({ id: c.id }));
}

function ParentChip({ id, role }: { id?: string; role: string }) {
  const parent = id ? getCattle(id) : undefined;
  return (
    <div className="rounded-lg border border-line bg-canvas px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-muted">{role}</p>
      {parent ? (
        <Link href={`/cattle/${parent.id}`} className="text-sm font-semibold text-brand-700 hover:underline">
          {parent.name} ({parent.id})
        </Link>
      ) : id ? (
        <span className="text-sm font-semibold text-ink">{id}</span>
      ) : (
        <span className="text-sm text-muted">Unknown</span>
      )}
    </div>
  );
}

export default async function CattleDetailPage(props: PageProps<"/cattle/[id]">) {
  const { id } = await props.params;
  const animal = getCattle(id);
  if (!animal) notFound();

  const offspring = cattle.filter((c) => c.damId === id || c.sireId === id);

  // Full siblings share both dam AND sire (both must be known)
  const fullSiblings = animal.damId && animal.sireId
    ? cattle.filter((c) => c.id !== id && c.damId === animal.damId && c.sireId === animal.sireId)
    : [];

  // Maternal half-siblings: same dam, different/unknown sire (excludes full siblings)
  const maternalHalf = animal.damId
    ? cattle.filter((c) => c.id !== id && c.damId === animal.damId && c.sireId !== animal.sireId)
    : [];

  // Paternal half-siblings: same sire, different/unknown dam (excludes full siblings)
  const paternalHalf = animal.sireId
    ? cattle.filter((c) => c.id !== id && c.sireId === animal.sireId && c.damId !== animal.damId)
    : [];

  const animalBirths = birthRecords.filter((b) => b.calfId === id);
  const animalBreedings = breedingRecords.filter((b) => b.damId === id || b.sireId === id);
  const animalVax = vaccinations.filter((v) => v.cattleId === id);
  const animalHealth = healthRecords.filter((h) => h.cattleId === id);

  const facts: [string, string][] = [
    ["Breed", animal.breed],
    ["Class", animal.class],
    ["Date of Birth", formatDate(animal.dob)],
    ["Age", ageFrom(animal.dob)],
    ["Weight", `${animal.weightKg} kg`],
    ["Location", animal.pasture],
    ["Acquisition", animal.acquisition],
  ];

  return (
    <>
      <Link href="/cattle" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <Icon.swap width={16} height={16} /> Back to Registry
      </Link>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-xl bg-brand-100 text-brand-700">
            <Icon.cow width={30} height={30} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink">{animal.name}</h1>
            <p className="text-sm text-muted">
              Tag {animal.id} · {animal.breed}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={animal.status} />
          <StatusBadge status={animal.health} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Profile" />
          <dl className="divide-y divide-line">
            {facts.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between px-5 py-2.5">
                <dt className="text-sm text-muted">{k}</dt>
                <dd className="text-sm font-medium text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Lineage & Genetics" />
          <div className="p-5">
            <div className="grid grid-cols-2 gap-3">
              <ParentChip id={animal.damId} role="Dam (Mother)" />
              <ParentChip id={animal.sireId} role="Sire (Father)" />
            </div>
            <p className="mt-4 mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Offspring ({offspring.length})
            </p>
            {offspring.length === 0 ? (
              <p className="text-sm text-muted">No offspring recorded.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {offspring.map((o) => (
                  <Link
                    key={o.id}
                    href={`/cattle/${o.id}`}
                    className="rounded-full border border-line bg-canvas px-3 py-1 text-xs font-medium text-ink hover:border-brand-300 hover:text-brand-700"
                  >
                    {o.name} ({o.id})
                  </Link>
                ))}
              </div>
            )}

            <p className="mt-5 mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Siblings
            </p>
            {fullSiblings.length === 0 && maternalHalf.length === 0 && paternalHalf.length === 0 ? (
              <p className="text-sm text-muted">
                {!animal.damId && !animal.sireId
                  ? "No lineage data — assign dam/sire to find siblings."
                  : "No siblings found in the registry."}
              </p>
            ) : (
              <div className="space-y-3">
                {fullSiblings.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-[11px] text-muted">
                      Full siblings ({fullSiblings.length}) — same dam &amp; sire
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {fullSiblings.map((s) => (
                        <Link
                          key={s.id}
                          href={`/cattle/${s.id}`}
                          className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 hover:border-brand-400"
                        >
                          {s.name} ({s.id})
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                {maternalHalf.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-[11px] text-muted">
                      Maternal half-siblings ({maternalHalf.length}) — same dam
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {maternalHalf.map((s) => (
                        <Link
                          key={s.id}
                          href={`/cattle/${s.id}`}
                          className="rounded-full border border-line bg-canvas px-3 py-1 text-xs font-medium text-ink hover:border-brand-300 hover:text-brand-700"
                        >
                          {s.name} ({s.id})
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                {paternalHalf.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-[11px] text-muted">
                      Paternal half-siblings ({paternalHalf.length}) — same sire
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {paternalHalf.map((s) => (
                        <Link
                          key={s.id}
                          href={`/cattle/${s.id}`}
                          className="rounded-full border border-line bg-canvas px-3 py-1 text-xs font-medium text-ink hover:border-brand-300 hover:text-brand-700"
                        >
                          {s.name} ({s.id})
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Breeding History" />
          <Table>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Partner</Th>
                <Th>Method</Th>
                <Th>Result</Th>
              </tr>
            </thead>
            <tbody>
              {animalBreedings.length === 0 && <EmptyRow colSpan={4} label="No breeding records." />}
              {animalBreedings.map((b) => (
                <tr key={b.id}>
                  <Td>{formatDate(b.serviceDate)}</Td>
                  <Td className="text-muted">{cattleLabel(b.damId === id ? b.sireId : b.damId)}</Td>
                  <Td className="text-muted">{b.method}</Td>
                  <Td><StatusBadge status={b.result} /></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>

        <Card>
          <CardHeader title="Birth Record" />
          <Table>
            <thead>
              <tr>
                <Th>Born</Th>
                <Th>Weight</Th>
                <Th>Calving</Th>
                <Th>Outcome</Th>
              </tr>
            </thead>
            <tbody>
              {animalBirths.length === 0 && <EmptyRow colSpan={4} label="No birth record on file." />}
              {animalBirths.map((b) => (
                <tr key={b.id}>
                  <Td>{formatDate(b.birthDate)}</Td>
                  <Td className="text-muted">{b.birthWeightKg} kg</Td>
                  <Td><Badge tone="gray">{b.calvingEase}</Badge></Td>
                  <Td><StatusBadge status={b.outcome} /></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>

        <Card>
          <CardHeader title="Vaccinations" />
          <Table>
            <thead>
              <tr>
                <Th>Vaccine</Th>
                <Th>Date</Th>
                <Th>Next Due</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {animalVax.length === 0 && <EmptyRow colSpan={4} label="No vaccinations recorded." />}
              {animalVax.map((v) => (
                <tr key={v.id}>
                  <Td className="font-medium">{v.vaccine}</Td>
                  <Td>{formatDate(v.date)}</Td>
                  <Td className="text-muted">{formatDate(v.nextDue)}</Td>
                  <Td><StatusBadge status={v.status} /></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>

        <Card>
          <CardHeader title="Health Events" />
          <Table>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Type</Th>
                <Th>Diagnosis</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {animalHealth.length === 0 && <EmptyRow colSpan={4} label="No health events recorded." />}
              {animalHealth.map((h) => (
                <tr key={h.id}>
                  <Td>{formatDate(h.date)}</Td>
                  <Td><Badge tone="gray">{h.type}</Badge></Td>
                  <Td className="text-muted">{h.diagnosis}</Td>
                  <Td><StatusBadge status={h.status} /></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </div>
    </>
  );
}
