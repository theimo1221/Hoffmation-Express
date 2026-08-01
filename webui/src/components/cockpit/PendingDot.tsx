/**
 * Marks a value that was changed from the UI but not yet processed by the nightly
 * run, so it is visibly "staged" rather than confirmed. The marker disappears on its
 * own once the nightly regenerates cockpit-data.json.
 */
export function PendingDot({ label = 'Lokal vorgemerkt — noch nicht vom Digest verarbeitet' }: { label?: string }) {
  return (
    <span
      title={label}
      aria-label={label}
      className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-amber-500 align-middle"
    />
  );
}
