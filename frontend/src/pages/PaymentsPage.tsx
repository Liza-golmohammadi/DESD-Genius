import { useEffect, useMemo, useState } from "react";

type PaymentItem = {
  id: number;
  order_ref: string;
  customer_id: number;
  total_amount: string;
  commission_amount: string;
  status: string;
  status_display: string;
  created_at: string;
};

type SettlementReportRow = {
  producer_id: number;
  producer_name: string;
  total_subtotal: string;
  total_commission: string;
  total_payout: string;
  settlement_count: number;
};

function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [reportRows, setReportRows] = useState<SettlementReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingCsv, setDownloadingCsv] = useState(false);
  const [error, setError] = useState("");

  const accessToken = localStorage.getItem("access");

  const currency = (value: string | number) => `£${Number(value).toFixed(2)}`;

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      };

      const [paymentsRes, reportRes] = await Promise.all([
        fetch("http://127.0.0.1:8000/api/payments/", {
          method: "GET",
          headers,
        }),
        fetch("http://127.0.0.1:8000/api/payments/reports/settlements/", {
          method: "GET",
          headers,
        }),
      ]);

      const paymentsData = await paymentsRes.json();
      const reportData = await reportRes.json();

      if (!paymentsRes.ok) {
        throw new Error(paymentsData?.detail || paymentsData?.error || "Could not load payments.");
      }

      if (!reportRes.ok) {
        throw new Error(reportData?.detail || reportData?.error || "Could not load settlement report.");
      }

      setPayments(Array.isArray(paymentsData) ? paymentsData : []);
      setReportRows(Array.isArray(reportData) ? reportData : []);
    } catch (err: any) {
      setError(err?.message || "Could not connect to the backend.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadCsv() {
    setDownloadingCsv(true);
    setError("");

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/payments/reports/settlements/?format=csv",
        {
          method: "GET",
          headers: {
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        }
      );

      if (!response.ok) {
        let message = "CSV download failed.";
        try {
          const data = await response.json();
          message = data?.detail || data?.error || message;
        } catch {
          // ignore json parse failure for non-json responses
        }
        throw new Error(message);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = "settlement_report.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err?.message || "Could not download CSV.");
    } finally {
      setDownloadingCsv(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = useMemo(() => {
    const totalPayments = payments.reduce((sum, item) => sum + Number(item.total_amount || 0), 0);
    const totalCommission = payments.reduce(
      (sum, item) => sum + Number(item.commission_amount || 0),
      0
    );
    const totalPayout = reportRows.reduce((sum, row) => sum + Number(row.total_payout || 0), 0);

    return {
      totalPayments,
      totalCommission,
      totalPayout,
      paymentCount: payments.length,
      producerCount: reportRows.length,
    };
  }, [payments, reportRows]);

  return (
    <div
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "32px 20px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ margin: 0, color: "#1b4332" }}>Payments & Settlements</h1>
          <p style={{ marginTop: 8, color: "#4b5563" }}>
            Admin financial overview for recorded order payments, platform commission, and producer payouts.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={loadData}
            disabled={loading}
            style={{
              padding: "12px 16px",
              borderRadius: 10,
              border: "1px solid #d1d5db",
              background: "#fff",
              color: "#111827",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>

          <button
            onClick={handleDownloadCsv}
            disabled={downloadingCsv}
            style={{
              padding: "12px 16px",
              borderRadius: 10,
              border: "none",
              background: "#2d6a4f",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {downloadingCsv ? "Downloading..." : "Download CSV Report"}
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            marginBottom: 20,
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#991b1b",
            padding: 16,
            borderRadius: 12,
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          marginBottom: 28,
        }}
      >
        <div
          style={{
            background: "#ffffff",
            borderRadius: 16,
            padding: 20,
            boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
            border: "1px solid #e5e7eb",
          }}
        >
          <div style={{ color: "#6b7280", fontSize: 13, fontWeight: 700 }}>TOTAL PAYMENTS</div>
          <div style={{ marginTop: 8, fontSize: 28, fontWeight: 800, color: "#111827" }}>
            {currency(totals.totalPayments)}
          </div>
        </div>

        <div
          style={{
            background: "#ffffff",
            borderRadius: 16,
            padding: 20,
            boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
            border: "1px solid #e5e7eb",
          }}
        >
          <div style={{ color: "#6b7280", fontSize: 13, fontWeight: 700 }}>TOTAL COMMISSION</div>
          <div style={{ marginTop: 8, fontSize: 28, fontWeight: 800, color: "#1b4332" }}>
            {currency(totals.totalCommission)}
          </div>
        </div>

        <div
          style={{
            background: "#ffffff",
            borderRadius: 16,
            padding: 20,
            boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
            border: "1px solid #e5e7eb",
          }}
        >
          <div style={{ color: "#6b7280", fontSize: 13, fontWeight: 700 }}>TOTAL PRODUCER PAYOUT</div>
          <div style={{ marginTop: 8, fontSize: 28, fontWeight: 800, color: "#111827" }}>
            {currency(totals.totalPayout)}
          </div>
        </div>

        <div
          style={{
            background: "#ffffff",
            borderRadius: 16,
            padding: 20,
            boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
            border: "1px solid #e5e7eb",
          }}
        >
          <div style={{ color: "#6b7280", fontSize: 13, fontWeight: 700 }}>RECORDED PAYMENTS</div>
          <div style={{ marginTop: 8, fontSize: 28, fontWeight: 800, color: "#111827" }}>
            {totals.paymentCount}
          </div>
        </div>
      </div>

      <div
        style={{
          background: "#ffffff",
          borderRadius: 16,
          padding: 24,
          boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
          border: "1px solid #e5e7eb",
          marginBottom: 24,
        }}
      >
        <h2 style={{ marginTop: 0, color: "#1f2937" }}>Settlement Report</h2>

        {loading ? (
          <p style={{ color: "#6b7280" }}>Loading settlement report...</p>
        ) : reportRows.length === 0 ? (
          <p style={{ color: "#6b7280" }}>No settlement data found yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                  <th style={{ padding: "12px 8px" }}>Producer</th>
                  <th style={{ padding: "12px 8px" }}>Subtotal</th>
                  <th style={{ padding: "12px 8px" }}>Commission</th>
                  <th style={{ padding: "12px 8px" }}>Payout</th>
                  <th style={{ padding: "12px 8px" }}>Settlements</th>
                </tr>
              </thead>
              <tbody>
                {reportRows.map((row) => (
                  <tr key={row.producer_id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "12px 8px", fontWeight: 600 }}>{row.producer_name}</td>
                    <td style={{ padding: "12px 8px" }}>{currency(row.total_subtotal)}</td>
                    <td style={{ padding: "12px 8px" }}>{currency(row.total_commission)}</td>
                    <td style={{ padding: "12px 8px" }}>{currency(row.total_payout)}</td>
                    <td style={{ padding: "12px 8px" }}>{row.settlement_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div
        style={{
          background: "#ffffff",
          borderRadius: 16,
          padding: 24,
          boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
          border: "1px solid #e5e7eb",
        }}
      >
        <h2 style={{ marginTop: 0, color: "#1f2937" }}>Payment Records</h2>

        {loading ? (
          <p style={{ color: "#6b7280" }}>Loading payment records...</p>
        ) : payments.length === 0 ? (
          <p style={{ color: "#6b7280" }}>No payment records found yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                  <th style={{ padding: "12px 8px" }}>Order Ref</th>
                  <th style={{ padding: "12px 8px" }}>Customer ID</th>
                  <th style={{ padding: "12px 8px" }}>Total</th>
                  <th style={{ padding: "12px 8px" }}>Commission</th>
                  <th style={{ padding: "12px 8px" }}>Status</th>
                  <th style={{ padding: "12px 8px" }}>Created</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "12px 8px", fontWeight: 600 }}>{payment.order_ref}</td>
                    <td style={{ padding: "12px 8px" }}>{payment.customer_id}</td>
                    <td style={{ padding: "12px 8px" }}>{currency(payment.total_amount)}</td>
                    <td style={{ padding: "12px 8px" }}>{currency(payment.commission_amount)}</td>
                    <td style={{ padding: "12px 8px" }}>{payment.status_display}</td>
                    <td style={{ padding: "12px 8px" }}>
                      {new Date(payment.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default PaymentsPage;