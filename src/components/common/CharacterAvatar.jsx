import { useState } from "react";

const SHAPES = {
  portrait: "rounded-2xl",
  circle: "rounded-full",
};

const SIZES = {
  portrait: {
    xs: "h-10 w-8",
    sm: "h-14 w-11",
    md: "h-20 w-16",
    lg: "h-28 w-[5.5rem]",
    xl: "h-36 w-28",
  },
  circle: {
    xs: "size-9",
    sm: "size-11",
    md: "size-14",
    lg: "size-20",
    xl: "size-28",
  },
};

const TONES = {
  inspector: "from-[#0E76A8] to-[#083b57]",
  tato: "from-[#1557B0] to-[#0b2740]",
  luz: "from-[#f59e0b] to-[#b45309]",
  hernan: "from-[#0B6FA4] to-[#083b57]",
  mateo: "from-[#22c55e] to-[#15803d]",
  efrain: "from-[#6366f1] to-[#3730a3]",
  valentina: "from-[#ec4899] to-[#9d174d]",
};

/**
 * Reusable character portrait.
 *
 * Loads `/assets/portraits/${id}.png` with `object-contain` and falls back to a
 * clean gradient medallion with the character initial when the image is missing.
 */
export default function CharacterAvatar({
  id,
  name,
  size = "md",
  shape = "portrait",
  ring = false,
  className = "",
}) {
  const [failedId, setFailedId] = useState(null);

  const label = name || id || "Personaje";
  const initial = label.trim().charAt(0).toUpperCase() || "?";
  const failed = failedId === id;

  const shapeKey = SHAPES[shape] ? shape : "portrait";
  const sizeKey = SIZES[shapeKey][size] ? size : "md";
  const base = [
    "relative inline-grid shrink-0 place-items-center overflow-hidden",
    SHAPES[shapeKey],
    SIZES[shapeKey][sizeKey],
    ring ? "ring-2 ring-av-yellow ring-offset-2 ring-offset-transparent" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (!id || failed) {
    return (
      <span
        role="img"
        aria-label={label}
        className={`${base} bg-linear-to-br ${TONES[id] ?? "from-[#0E76A8] to-[#083b57]"} font-display text-white`}
      >
        <span aria-hidden="true">{initial}</span>
      </span>
    );
  }

  return (
    <span
      className={`${base} bg-linear-to-br from-white/70 to-av-blue/10`}
    >
      <img
        src={`/assets/portraits/${id}.png`}
        alt={label}
        className="size-full object-contain"
        onError={() => setFailedId(id)}
        draggable={false}
      />
    </span>
  );
}
