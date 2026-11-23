/** A Material Symbols icon at a set size. The size goes in `style`: the icon
 * font's own stylesheet is unlayered, so a Tailwind text-* size class loses to
 * its 24px (true across the app today). */
export function MaterialIcon({ name, size, fill = false, className = "" }: {
  name: string;
  size: number;
  fill?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`material-symbols-outlined shrink-0 leading-none ${className}`}
      style={{ fontSize: size, ...(fill ? { fontVariationSettings: "'FILL' 1" } : {}) }}
    >
      {name}
    </span>
  );
}
