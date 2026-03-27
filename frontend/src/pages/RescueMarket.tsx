import { motion } from "motion/react";
import {
  Clock,
  Tag,
  AlertTriangle,
  BellRing,
  MessageCircle,
  Send,
  Smartphone,
  ShoppingBasket,
  Leaf,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import api from "../api";
import useAuth from "../context/useAuth";


// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  pageBg:      "#f4f6f2",
  heroBg:      "#eef3eb",
  heroBorder:  "#d8e5d2",
  cardBg:      "#ffffff",
  cardBorder:  "#e8ede5",
  cardShadow:  "0 2px 10px rgba(60,80,60,0.07)",
  cardShadowHover: "0 8px 28px rgba(60,80,60,0.13)",
  textPrimary: "#2a3628",
  textBody:    "#526155",
  textMuted:   "#8da48f",
  green:       "#3e7055",
  greenLight:  "#eaf2ec",
  greenMid:    "#5a9470",
  tagBg:       "#c9674f",
  tagText:     "#fff",
  timerBg:     "#f3ead6",
  timerText:   "#7a5c1e",
  saveBg:      "#e6f0e8",
  saveText:    "#3e7055",
  pillBlueBg:  "#eaf0f8",
  pillBlue:    "#3b5ea6",
  pillAmberBg: "#f5edd8",
  pillAmber:   "#7a5c1e",
  broadcastBg: "#f7f9f6",
  chartLatest: ["#3e7055", "#6aab80"],
  chartRest:   ["#c3ddc9", "#9ec9a9"],
};

// ── Static data ───────────────────────────────────────────────────────────────
const surplusItems = [
  {
    id: 1,
    name: "Imperfect Carrots",
    farm: "Somerset Valley Farm",
    originalPrice: 2.5,
    price: 1.0,
    expiresIn: "12 hours",
    image: "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=600&q=80",
    reason: "Odd shapes, perfectly delicious",
    kgSaved: 2.4,
  },
  {
    id: 2,
    name: "Overripe Bananas",
    farm: "Bristol City Growers",
    originalPrice: 3.0,
    price: 0.8,
    expiresIn: "6 hours",
    image: "https://images.unsplash.com/photo-1481349518771-20055b2a7b24?w=600&q=80",
    reason: "Perfect for baking banana bread",
    kgSaved: 1.8,
  },
  {
    id: 3,
    name: "Bumper Crop Courgettes",
    farm: "Green Acres",
    originalPrice: 4.0,
    price: 1.5,
    expiresIn: "24 hours",
    image: "https://images.unsplash.com/photo-1612257416648-58b0f78fd0b0?w=600&q=80",
    reason: "Unexpectedly large harvest",
    kgSaved: 3.6,
  },
  {
    id: 4,
    name: "Surplus Heritage Tomatoes",
    farm: "Green Valley Farm",
    originalPrice: 3.75,
    price: 1.5,
    expiresIn: "8 hours",
    image: "https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=600&q=80",
    reason: "Restaurant order cancelled — must go today",
    kgSaved: 4.2,
  },
  {
    id: 5,
    name: "End-of-Week Spinach",
    farm: "Somerset Herb Garden",
    originalPrice: 2.0,
    price: 0.7,
    expiresIn: "5 hours",
    image: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600&q=80",
    reason: "Cut this morning, needs to move fast",
    kgSaved: 1.2,
  },
  {
    id: 6,
    name: "Windfall Bramley Apples",
    farm: "Wye Valley Orchard",
    originalPrice: 3.0,
    price: 1.2,
    expiresIn: "18 hours",
    image: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=600&q=80",
    reason: "Dropped early — perfect for cooking",
    kgSaved: 5.1,
  },
];

const broadcasts = [
  {
    farm: "Somerset Valley Farm",
    time: "Just now",
    timeColor: "#b84530",
    timeBg: "#fdecea",
    borderColor: "#c9674f",
    opacity: 1,
    message:
      "We just finished the morning harvest and have way too many courgettes! Broadcasting a 60% discount to the community. Must be collected or delivered today!",
    reach: 245,
  },
  {
    farm: "Bristol City Growers",
    time: "2 hours ago",
    timeColor: "#6b6b6b",
    timeBg: "#f0f0ee",
    borderColor: "#c8a86b",
    opacity: 0.75,
    message:
      "A restaurant order fell through, so we have 10 kg of premium heritage tomatoes that need a home. Slashing prices by 50% to prevent waste.",
    reach: 180,
  },
  {
    farm: "Wye Valley Orchard",
    time: "4 hours ago",
    timeColor: "#6b6b6b",
    timeBg: "#f0f0ee",
    borderColor: "#b5c4b1",
    opacity: 0.5,
    message:
      "Strong winds last night brought down a load of Bramley apples before they were ready to pick. They're fine for cooking — just not shelf-perfect. Heavily discounted.",
    reach: 312,
  },
];

const wasteChartData = [
  { label: "Week 1", kg: 38 },
  { label: "Week 2", kg: 61 },
  { label: "Week 3", kg: 44 },
  { label: "Week 4\n(so far)", kg: 72 },
];
const maxKg = Math.max(...wasteChartData.map((d) => d.kg));

// ── Shared typography ─────────────────────────────────────────────────────────
const font = "'Segoe UI', system-ui, -apple-system, sans-serif";
const sectionLabel: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 1.1,
  textTransform: "uppercase",
  color: C.green,
  fontFamily: font,
};

// ── Main component ────────────────────────────────────────────────────────────
export default function RescueMarket() {
  const [subscribed, setSubscribed] = useState(false);
  const [phone, setPhone] = useState("");
  const [productIds, setProductIds] = useState<Record<string, number>>({});
  const { user } = useAuth();
  const navigate = useNavigate();

  const isAuthed = !!localStorage.getItem("access");
  const isCustomer = isAuthed && !user?.producer_profile;

  useEffect(() => {
    api.get<{ id: number; name: string }[]>("/api/products/").then((res) => {
      const map: Record<string, number> = {};
      res.data.forEach((p) => { map[p.name.toLowerCase()] = p.id; });
      setProductIds(map);
    }).catch(() => {});
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "36px 24px",
        fontFamily: font,
        background: C.pageBg,
        minHeight: "100vh",
      }}
    >
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <div
        style={{
          background: C.heroBg,
          borderRadius: 28,
          padding: "40px 44px",
          marginBottom: 28,
          border: `1px solid ${C.heroBorder}`,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 32,
        }}
      >
        <div style={{ maxWidth: 520 }}>
          <div style={{ ...sectionLabel, marginBottom: 16 }}>
            <AlertTriangle size={13} />
            Live Surplus Broadcasts
          </div>

          <h1
            style={{
              fontSize: 36,
              fontWeight: 700,
              color: C.textPrimary,
              margin: "0 0 14px",
              lineHeight: 1.25,
              fontFamily: "Georgia, serif",
              letterSpacing: -0.3,
            }}
          >
            The Rescue Market
          </h1>
          <p
            style={{
              color: C.textBody,
              fontSize: 16,
              lineHeight: 1.75,
              margin: 0,
              fontWeight: 400,
            }}
          >
            When local farms have unexpected bumper crops or last-minute surplus, they
            broadcast it here. Opt-in to alerts to rescue perfectly good food at deep
            discounts before it goes to waste.
          </p>
        </div>

        {/* SMS card */}
        <div
          style={{
            background: C.cardBg,
            padding: "28px 28px",
            borderRadius: 20,
            boxShadow: C.cardShadow,
            border: `1px solid ${C.cardBorder}`,
            minWidth: 290,
            width: "100%",
            maxWidth: 340,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                background: C.greenLight,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: C.green,
              }}
            >
              <BellRing size={17} />
            </div>
            <div>
              <div style={{ fontWeight: 600, color: C.textPrimary, fontSize: 14, lineHeight: 1.3 }}>
                Instant Alerts
              </div>
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                Get notified of last-minute deals
              </div>
            </div>
          </div>

          {!subscribed ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter mobile number"
                style={{
                  width: "100%",
                  background: C.pageBg,
                  border: `1px solid ${C.cardBorder}`,
                  borderRadius: 10,
                  padding: "10px 13px",
                  fontSize: 14,
                  color: C.textPrimary,
                  outline: "none",
                  boxSizing: "border-box",
                  fontFamily: font,
                }}
              />
              <button
                onClick={() => setSubscribed(true)}
                style={{
                  width: "100%",
                  background: C.green,
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: 14,
                  padding: "11px 0",
                  borderRadius: 10,
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  fontFamily: font,
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.background = "#2c5440")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.background = C.green)
                }
              >
                <Smartphone size={15} /> Subscribe to SMS Alerts
              </button>
            </div>
          ) : (
            <div
              style={{
                background: C.greenLight,
                border: `1px solid ${C.heroBorder}`,
                borderRadius: 10,
                padding: 16,
                textAlign: "center",
              }}
            >
              <p style={{ fontSize: 14, fontWeight: 600, color: C.green, margin: "0 0 4px" }}>
                You're subscribed!
              </p>
              <p style={{ fontSize: 12, color: C.textBody, margin: 0, lineHeight: 1.5 }}>
                We'll text you when farms within 5 miles broadcast surplus.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Waste chart ───────────────────────────────────────────────── */}
      <WasteChart />

      {/* ── Two-column body ────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(260px,1fr) 2fr",
          gap: 28,
          alignItems: "start",
        }}
      >
        {/* Broadcasts */}
        <div>
          <div style={{ ...sectionLabel, marginBottom: 14 }}>
            <MessageCircle size={13} /> Live Farm Broadcasts
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {broadcasts.map((b) => (
              <div
                key={b.farm}
                style={{
                  background: C.broadcastBg,
                  borderRadius: 18,
                  padding: "18px 18px 16px",
                  border: `1px solid ${C.cardBorder}`,
                  position: "relative",
                  overflow: "hidden",
                  opacity: b.opacity,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: 3,
                    height: "100%",
                    background: b.borderColor,
                    borderRadius: "3px 0 0 3px",
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 8,
                    paddingLeft: 6,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary }}>
                    {b.farm}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: b.timeColor,
                      background: b.timeBg,
                      padding: "3px 9px",
                      borderRadius: 999,
                      whiteSpace: "nowrap",
                      marginLeft: 8,
                    }}
                  >
                    {b.time}
                  </span>
                </div>
                <p
                  style={{
                    fontSize: 13,
                    color: C.textBody,
                    fontStyle: "italic",
                    lineHeight: 1.65,
                    margin: "0 0 10px",
                    paddingLeft: 6,
                  }}
                >
                  "{b.message}"
                </p>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 11,
                    color: C.textMuted,
                    paddingLeft: 6,
                  }}
                >
                  <Send size={10} /> Broadcast to {b.reach} local residents
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Product grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
            gap: 18,
          }}
        >
          {surplusItems.map((item) => {
            const savePct = Math.round((1 - item.price / item.originalPrice) * 100);
            const realId = productIds[item.name.toLowerCase()];
            return (
              <SurplusCard
                key={item.id}
                item={item}
                savePct={savePct}
                realProductId={realId}
                isAuthed={isAuthed}
                isCustomer={isCustomer}
                onLoginRequired={() => navigate("/login")}
              />
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

// ── Waste chart ───────────────────────────────────────────────────────────────
function WasteChart() {
  const totalKg = wasteChartData.reduce((s, d) => s + d.kg, 0);
  const co2Saved = Math.round(totalKg * 2.5);
  const moneySaved = Math.round(totalKg * 2.1);

  return (
    <div
      style={{
        background: C.cardBg,
        borderRadius: 22,
        border: `1px solid ${C.cardBorder}`,
        padding: "26px 30px",
        marginBottom: 28,
        boxShadow: C.cardShadow,
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <div style={{ ...sectionLabel, marginBottom: 6 }}>
            <Leaf size={13} /> Food Rescued This Month
          </div>
          <p style={{ margin: 0, fontSize: 13, color: C.textBody, lineHeight: 1.5 }}>
            Kilograms of surplus food rescued from going to waste — March 2026
          </p>
        </div>

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <StatPill label="Total rescued" value={`${totalKg} kg`} color={C.saveText} bg={C.saveBg} />
          <StatPill label="CO₂ equivalent" value={`${co2Saved} kg`} color={C.pillBlue} bg={C.pillBlueBg} />
          <StatPill label="Saved by shoppers" value={`£${moneySaved}`} color={C.pillAmber} bg={C.pillAmberBg} />
        </div>
      </div>

      {/* Bar chart */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 14, height: 130 }}>
        {wasteChartData.map((d, i) => {
          const heightPct = (d.kg / maxKg) * 100;
          const isLatest = i === wasteChartData.length - 1;
          return (
            <div
              key={d.label}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                height: "100%",
                justifyContent: "flex-end",
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: isLatest ? C.green : C.textBody,
                  fontFamily: font,
                }}
              >
                {d.kg} kg
              </span>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${heightPct}%` }}
                transition={{ duration: 0.55, delay: i * 0.08, ease: "easeOut" }}
                style={{
                  width: "100%",
                  background: isLatest
                    ? `linear-gradient(to top, ${C.chartLatest[0]}, ${C.chartLatest[1]})`
                    : `linear-gradient(to top, ${C.chartRest[0]}, ${C.chartRest[1]})`,
                  borderRadius: "8px 8px 3px 3px",
                  minHeight: 4,
                }}
              />
              <span
                style={{
                  fontSize: 12,
                  fontWeight: isLatest ? 600 : 400,
                  color: isLatest ? C.green : C.textMuted,
                  textAlign: "center",
                  lineHeight: 1.4,
                  fontFamily: font,
                  whiteSpace: "pre-line",
                }}
              >
                {d.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatPill({
  label,
  value,
  color,
  bg,
}: {
  label: string;
  value: string;
  color: string;
  bg: string;
}) {
  return (
    <div
      style={{
        background: bg,
        borderRadius: 12,
        padding: "10px 16px",
        textAlign: "center",
        minWidth: 105,
      }}
    >
      <div style={{ fontSize: 17, fontWeight: 700, color, fontFamily: font }}>{value}</div>
      <div style={{ fontSize: 11, color: C.textBody, marginTop: 3, lineHeight: 1.4 }}>{label}</div>
    </div>
  );
}

// ── Surplus card ──────────────────────────────────────────────────────────────
type SurplusItem = (typeof surplusItems)[number];

function SurplusCard({
  item, savePct, realProductId, isAuthed, isCustomer, onLoginRequired,
}: {
  item: SurplusItem;
  savePct: number;
  realProductId?: number;
  isAuthed: boolean;
  isCustomer: boolean;
  onLoginRequired: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const [added, setAdded] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  async function handleAddToCart() {
    if (!isAuthed) { onLoginRequired(); return; }
    if (!isCustomer || !realProductId) return;
    setAdding(true);
    setError("");
    try {
      await api.post("/api/cart/items/", { product_id: realProductId, quantity: 1 });
      setAdded(true);
      setTimeout(() => setAdded(false), 2500);
    } catch (err: any) {
      const msg = err?.response?.data?.error || "Couldn't add to basket. Try again.";
      setError(msg);
      setTimeout(() => setError(""), 3500);
    } finally {
      setAdding(false);
    }
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: C.cardBg,
        borderRadius: 20,
        border: `1px solid ${hovered ? C.heroBorder : C.cardBorder}`,
        overflow: "hidden",
        boxShadow: hovered ? C.cardShadowHover : C.cardShadow,
        transition: "box-shadow 0.2s, border-color 0.2s",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Image */}
      <div
        style={{
          position: "relative",
          aspectRatio: "4/3",
          overflow: "hidden",
          background: C.heroBg,
        }}
      >
        <img
          src={imgFailed ? "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=600&q=80" : item.image}
          alt={item.name}
          onError={() => setImgFailed(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            transform: hovered ? "scale(1.04)" : "scale(1)",
            transition: "transform 0.45s ease",
          }}
        />
        {/* Badges */}
        <div
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            display: "flex",
            flexDirection: "column",
            gap: 5,
          }}
        >
          <span
            style={{
              background: C.tagBg,
              color: C.tagText,
              padding: "4px 10px",
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontFamily: font,
            }}
          >
            <Tag size={10} /> Save {savePct}%
          </span>
          <span
            style={{
              background: C.timerBg,
              color: C.timerText,
              padding: "4px 10px",
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontFamily: font,
            }}
          >
            <Clock size={10} /> {item.expiresIn}
          </span>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "18px 18px 18px", display: "flex", flexDirection: "column", flex: 1 }}>
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.8,
            textTransform: "uppercase",
            color: C.greenMid,
            margin: "0 0 5px",
            fontFamily: font,
          }}
        >
          {item.farm}
        </p>
        <h3
          style={{
            fontSize: 17,
            fontWeight: 600,
            color: C.textPrimary,
            margin: "0 0 6px",
            lineHeight: 1.35,
            fontFamily: font,
          }}
        >
          {item.name}
        </h3>
        <p
          style={{
            fontSize: 13,
            color: C.textBody,
            margin: "0 0 16px",
            flex: 1,
            lineHeight: 1.6,
            fontFamily: font,
          }}
        >
          {item.reason}
        </p>

        {/* Price row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: `1px solid ${C.cardBorder}`,
            paddingTop: 14,
            marginBottom: 12,
          }}
        >
          <div>
            <p style={{ fontSize: 12, color: C.textMuted, textDecoration: "line-through", margin: "0 0 2px", fontFamily: font }}>
              £{item.originalPrice.toFixed(2)}
            </p>
            <p style={{ fontSize: 21, fontWeight: 700, color: C.green, margin: 0, fontFamily: font }}>
              £{item.price.toFixed(2)}
            </p>
          </div>
          <span
            style={{
              fontSize: 11,
              color: C.saveText,
              background: C.saveBg,
              padding: "4px 10px",
              borderRadius: 999,
              fontWeight: 600,
              fontFamily: font,
            }}
          >
            Saves {item.kgSaved} kg
          </span>
        </div>

        {/* Add to basket */}
        <button
          onClick={handleAddToCart}
          disabled={adding || (isAuthed && (!isCustomer || !realProductId))}
          style={{
            width: "100%",
            padding: "11px 0",
            borderRadius: 10,
            border: "none",
            background: added
              ? "#4a9163"
              : adding || (isAuthed && (!isCustomer || !realProductId))
              ? "#a8bfae"
              : C.green,
            color: "#fff",
            fontWeight: 600,
            fontSize: 14,
            cursor: adding || (isAuthed && (!isCustomer || !realProductId)) ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            fontFamily: font,
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) => {
            if (!adding && !added && (isAuthed ? (isCustomer && !!realProductId) : true))
              (e.currentTarget as HTMLButtonElement).style.background = "#2c5440";
          }}
          onMouseLeave={(e) => {
            if (!adding && !added && (isAuthed ? (isCustomer && !!realProductId) : true))
              (e.currentTarget as HTMLButtonElement).style.background = C.green;
          }}
        >
          <ShoppingBasket size={15} />
          {added
            ? "Added to basket!"
            : adding
            ? "Adding..."
            : !isAuthed
            ? "Log in to add"
            : isCustomer
            ? "Add to basket"
            : "Customers only"}
        </button>
        {error && (
          <p style={{ fontSize: 12, color: "#c0392b", margin: "6px 0 0", textAlign: "center", fontFamily: font }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
