import { useState } from "react";
import { Check, X, AlertCircle } from "lucide-react";
import api from "../api";

type CouponFormProps = {
  subtotal: number;
  onApply: (discountData: {
    couponCode: string;
    discountAmount: number;
    finalTotal: number;
  }) => void;
  onRemove?: () => void;
  appliedCoupon?: string | null;
};

const C = {
  green: "#2d6a4f",
  accent: "#40916c",
  stone900: "#1c1917",
  stone600: "#57534e",
  stone500: "#78716c",
  stone400: "#a8a29e",
  stone200: "#e7e5e4",
  stone100: "#f5f5f4",
};

export default function CouponForm({
  subtotal,
  onApply,
  onRemove,
  appliedCoupon,
}: CouponFormProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [couponInfo, setCouponInfo] = useState<any>(null);

  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    try {
      const response = await api.post("/api/discounts/coupons/apply/", {
        code: code.toUpperCase(),
        subtotal: subtotal,
      });

      const { coupon_code, discount_amount, discount_type, discount_value, final_total } = response.data;

      setCouponInfo({
        code: coupon_code,
        discountType: discount_type,
        discountValue: discount_value,
        discountAmount: discount_amount,
      });

      setSuccess(true);
      setCode("");

      onApply({
        couponCode: coupon_code,
        discountAmount: discount_amount,
        finalTotal: final_total,
      });

      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      const message =
        err?.response?.data?.code ||
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        "Failed to apply coupon";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function handleRemove() {
    setCouponInfo(null);
    setCode("");
    setError("");
    setSuccess(false);
    onRemove?.();
  }

  if (appliedCoupon && couponInfo) {
    return (
      <div
        style={{
          padding: 16,
          background: "#ecfdf3",
          border: "1px solid #d1fae5",
          borderRadius: 12,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Check size={20} color="#059669" />
          <div>
            <p style={{ margin: 0, fontWeight: 700, color: "#047857", fontSize: 14 }}>
              Coupon Applied: {appliedCoupon}
            </p>
            <p style={{ margin: "4px 0 0", color: "#065f46", fontSize: 12 }}>
              {couponInfo.discountType === "percentage"
                ? `${couponInfo.discountValue}% off`
                : `£${couponInfo.discountValue} off`}
              {" "}
              (Save: £{couponInfo.discountAmount})
            </p>
          </div>
        </div>
        <button
          onClick={handleRemove}
          style={{
            background: "#dc2626",
            color: "#fff",
            border: "none",
            borderRadius: 999,
            padding: "6px 16px",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <X size={16} /> Remove
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleApply}>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          type="text"
          placeholder="Enter coupon code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          disabled={loading || !!appliedCoupon}
          style={{
            flex: 1,
            padding: "10px 12px",
            border: error ? "1px solid #dc2626" : `1px solid ${C.stone200}`,
            borderRadius: 8,
            fontSize: 14,
            fontFamily: "inherit",
            backgroundColor: appliedCoupon ? C.stone100 : "white",
            opacity: appliedCoupon ? 0.6 : 1,
          }}
        />
        <button
          type="submit"
          disabled={loading || !code.trim() || !!appliedCoupon}
          style={{
            padding: "10px 20px",
            background: loading || !code.trim() || appliedCoupon ? C.stone400 : C.green,
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 14,
            cursor: loading || !code.trim() || appliedCoupon ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Validating..." : "Apply"}
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: "10px 12px",
            background: "#fef2f2",
            color: "#b91c1c",
            borderRadius: 8,
            fontSize: 13,
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            marginBottom: 12,
          }}
        >
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
          {error}
        </div>
      )}

      {success && (
        <div
          style={{
            padding: "10px 12px",
            background: "#ecfdf3",
            color: "#166534",
            borderRadius: 8,
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 12,
          }}
        >
          <Check size={16} />
          Coupon applied successfully!
        </div>
      )}
    </form>
  );
}
