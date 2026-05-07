import { Tag } from "lucide-react";

type DiscountBadgeProps = {
  discountPercentage: number;
  reason?: string;
};

export default function DiscountBadge({
  discountPercentage,
  reason,
}: DiscountBadgeProps) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 12px",
        background: "#fef3c7",
        color: "#92400e",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 1,
        textTransform: "uppercase",
        title: reason || "Discount applied",
      }}
    >
      <Tag size={13} />
      {discountPercentage}% Off
    </div>
  );
}
