import React from "react";

export function ChangeImpactPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold">Change Impact</h2>
          <p className="text-xs text-neutral-500">Simulation view — change ripple and impacted artifacts.</p>
        </div>
        <div className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-700">
          EPIC-1 Ledger Enabled
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-8 rounded-xl border border-neutral-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Impact Summary</div>
            <div className="text-xs text-neutral-500">Next: EPIC-2/3/4/5 dependency graph</div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-neutral-200 p-3">
              <div className="text-xs text-neutral-500">Impacted Sections</div>
              <div className="text-xl font-semibold">—</div>
            </div>
            <div className="rounded-lg border border-neutral-200 p-3">
              <div className="text-xs text-neutral-500">Impacted Variables</div>
              <div className="text-xl font-semibold">—</div>
            </div>
            <div className="rounded-lg border border-neutral-200 p-3">
              <div className="text-xs text-neutral-500">Rework Risk</div>
              <div className="text-xl font-semibold">—</div>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-4 text-sm text-neutral-600">
            This panel becomes real once EPIC-2 applicability + EPIC-3 obligations + EPIC-4 variables emit dependency edges.
          </div>
        </div>

        <div className="col-span-4 rounded-xl border border-neutral-200 bg-white p-4">
          <div className="text-sm font-medium">Next Recommended Action</div>
          <div className="mt-2 text-xs text-neutral-500">Complete EPIC-2 to unlock obligation re-evaluation and true ripples.</div>
          <button className="mt-4 w-full rounded-md bg-black px-3 py-2 text-sm text-white">Go to Applicability</button>
        </div>
      </div>
    </div>
  );
}
