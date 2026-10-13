import styles from "./CategoryBadge.module.css";

type CategoryValue =
  | "BATHROOM"
  | "KITCHEN"
  | "LIVING_ROOM"
  | "BEDROOM"
  | "EXTERIOR"
  | "OTHER"
  | null
  | undefined;

const LABEL_MAP: Record<string, string> = {
  BATHROOM: "Bathroom",
  KITCHEN: "Kitchen",
  LIVING_ROOM: "Living Room",
  BEDROOM: "Bedroom",
  EXTERIOR: "Exterior",
  OTHER: "Other",
};

interface CategoryBadgeProps {
  category: CategoryValue;
}

export default function CategoryBadge({ category }: CategoryBadgeProps) {
  if (!category) return null;
  const label = LABEL_MAP[category] ?? category;
  return (
    <span className={`${styles.badge} ${styles[category.toLowerCase().replace("_", "")] ?? ""}`}>
      {label}
    </span>
  );
}
