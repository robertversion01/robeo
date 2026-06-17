/** Vékony felső jelzés — lista frissül, tartalom marad látható. */
export default function ListRefreshingBar({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div
      className="mb-2 h-0.5 w-full overflow-hidden rounded-full bg-[#1a2328]"
      role="status"
      aria-live="polite"
    >
      <div className="h-full w-1/3 animate-[shimmer_0.9s_ease-in-out_infinite] rounded-full bg-[#38c7d0]/70" />
    </div>
  );
}
