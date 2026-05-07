import { useEffect, useMemo, useState, type CSSProperties } from "react";

type ProducerOption = {
  producer_id: number;
  producer_name: string;
  producer_email: string;
};

type ProducerPayment = {
  producer_order_id: number;
  producer_id: number;
  producer_email: string;
  producer_name: string;
  producer_order_status: string;
  subtotal: string;
  commission_amount: string;
  payout_amount: string;
  settlement_status: string;
  items: {
    product_name: string;
    quantity: number;
    unit_price: string;
    line_total: string;
  }[];
};

type OrderBreakdown = {
  order_number: string;
  created_at: string;
  customer_email: string;
  status: string;
  order_type: string;
  organisation_name: string;
  total_amount: string;
  commission_amount: string;
  expected_commission_5_percent: string;
  payment_status: string;
  producer_count: number;
  producer_payments: ProducerPayment[];
};

type ProducerBreakdown = {
  producer_id: number;
  producer_name: string;
  producer_email: string;
  total_subtotal: string;
  total_commission: string;
  total_payout: string;
  settlement_count: number;
};

type CommissionReport = {
  period: {
    date_from: string;
    date_to: string;
  };
  summary: {
    total_order_value: string;
    total_commission: string;
    total_producer_payout: string;
    number_of_orders_processed: number;
    commission_rate: string;
    producer_payout_rate: string;
  };
  monthly_summary: {
    month_start: string;
    month_to_date_order_value: string;
    month_to_date_commission: string;
    month_to_date_order_count: number;
  };
  year_to_date_summary: {
    year_start: string;
    ytd_order_value: string;
    ytd_commission: string;
    ytd_order_count: number;
  };
  calculation_checks: {
    single_order_100: {
      order_total: string;
      commission_5_percent: string;
      producer_payment_95_percent: string;
    };
    multi_vendor_150: {
      order_total: string;
      total_commission_5_percent: string;
      producer_1_subtotal: string;
      producer_1_payment_95_percent: string;
      producer_2_subtotal: string;
      producer_2_payment_95_percent: string;
    };
  };
  producer_options: ProducerOption[];
  producer_breakdown: ProducerBreakdown[];
  orders: OrderBreakdown[];
};

const API_BASE = "http://127.0.0.1:8000";
const GBP = String.fromCharCode(163);

function dateOffset(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function currency(value: string | number) {
  return `${GBP}${Number(value || 0).toFixed(2)}`;
}

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadBlob(filename: string, content: BlobPart, type: string) {
  const blob = new Blob([content], { type });
  const url = window.URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.URL.revokeObjectURL(url);
}

function buildCsv(report: CommissionReport) {
  const rows: string[][] = [];

  rows.push(["Network Commission Report"]);
  rows.push(["Date From", report.period.date_from]);
  rows.push(["Date To", report.period.date_to]);
  rows.push([]);
  rows.push(["Summary"]);
  rows.push(["Total Order Value", report.summary.total_order_value]);
  rows.push(["Total Commission 5 percent", report.summary.total_commission]);
  rows.push(["Total Producer Payout 95 percent", report.summary.total_producer_payout]);
  rows.push(["Orders Processed", String(report.summary.number_of_orders_processed)]);
  rows.push([]);
  rows.push([
    "Order Number",
    "Created At",
    "Customer Email",
    "Order Status",
    "Payment Status",
    "Order Total",
    "Order Commission 5 percent",
    "Producer",
    "Producer Subtotal",
    "Producer Commission 5 percent",
    "Producer Payout 95 percent",
    "Settlement Status",
  ]);

  report.orders.forEach((order) => {
    order.producer_payments.forEach((producer) => {
      rows.push([
        order.order_number,
        order.created_at,
        order.customer_email,
        order.status,
        order.payment_status,
        order.total_amount,
        order.commission_amount,
        producer.producer_name,
        producer.subtotal,
        producer.commission_amount,
        producer.payout_amount,
        producer.settlement_status,
      ]);
    });
  });

  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}

function buildExcelHtml(report: CommissionReport) {
  const rows = report.orders
    .flatMap((order) =>
      order.producer_payments.map(
        (producer) => `
          <tr>
            <td>${order.order_number}</td>
            <td>${order.created_at}</td>
            <td>${order.customer_email}</td>
            <td>${order.status}</td>
            <td>${order.payment_status}</td>
            <td>${order.total_amount}</td>
            <td>${order.commission_amount}</td>
            <td>${producer.producer_name}</td>
            <td>${producer.subtotal}</td>
            <td>${producer.commission_amount}</td>
            <td>${producer.payout_amount}</td>
            <td>${producer.settlement_status}</td>
          </tr>`
      )
    )
    .join("");

  return `
    <html>
      <body>
        <h1>Network Commission Report</h1>
        <p>Period: ${report.period.date_from} to ${report.period.date_to}</p>
        <p>Total order value: ${report.summary.total_order_value}</p>
        <p>Total commission: ${report.summary.total_commission}</p>
        <p>Total producer payout: ${report.summary.total_producer_payout}</p>

        <table border="1">
          <tr>
            <th>Order Number</th>
            <th>Created At</th>
            <th>Customer Email</th>
            <th>Order Status</th>
            <th>Payment Status</th>
            <th>Order Total</th>
            <th>Order Commission 5 percent</th>
            <th>Producer</th>
            <th>Producer Subtotal</th>
            <th>Producer Commission 5 percent</th>
            <th>Producer Payout 95 percent</th>
            <th>Settlement Status</th>
          </tr>
          ${rows}
        </table>
      </body>
    </html>
  `;
}

function pdfEscape(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function buildSimplePdf(report: CommissionReport) {
  const lines = [
    "Network Commission Report",
    `Period: ${report.period.date_from} to ${report.period.date_to}`,
    `Total order value: ${currency(report.summary.total_order_value)}`,
    `Total commission 5 percent: ${currency(report.summary.total_commission)}`,
    `Total producer payout 95 percent: ${currency(report.summary.total_producer_payout)}`,
    `Orders processed: ${report.summary.number_of_orders_processed}`,
    "",
    "Order breakdown:",
  ];

  report.orders.forEach((order) => {
    lines.push(
      `${order.order_number} | Total ${currency(order.total_amount)} | Commission ${currency(
        order.commission_amount
      )} | Payment ${order.payment_status}`
    );

    order.producer_payments.forEach((producer) => {
      lines.push(
        `  ${producer.producer_name} | Subtotal ${currency(producer.subtotal)} | Payout ${currency(
          producer.payout_amount
        )}`
      );
    });
  });

  const textCommands = lines
    .slice(0, 45)
    .map((line) => `(${pdfEscape(line)}) Tj T*`)
    .join(" ");

  const content = `BT /F1 10 Tf 40 790 Td 14 TL ${textCommands} ET`;

  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj\n",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n",
    `5 0 obj << /Length ${content.length} >> stream\n${content}\nendstream endobj\n`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];

  objects.forEach((obj) => {
    offsets.push(pdf.length);
    pdf += obj;
  });

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  offsets.forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });

  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return pdf;
}

function PaymentsPage() {
  const [report, setReport] = useState<CommissionReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState("");
  const [error, setError] = useState("");

  const [dateFrom, setDateFrom] = useState(dateOffset(-14));
  const [dateTo, setDateTo] = useState(dateOffset(0));
  const [producer, setProducer] = useState("all");
  const [status, setStatus] = useState("all");
  const [selectedOrderNumber, setSelectedOrderNumber] = useState("");

  const accessToken = localStorage.getItem("access");

  function buildQuery() {
    const params = new URLSearchParams();
    params.set("date_from", dateFrom);
    params.set("date_to", dateTo);

    if (producer !== "all") params.set("producer", producer);
    if (status !== "all") params.set("status", status);

    return params.toString();
  }

  async function loadReport() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE}/api/payments/reports/commission/?${buildQuery()}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.error || "Could not load commission report.");
      }

      setReport(data);
      setSelectedOrderNumber((current) => current || data.orders?.[0]?.order_number || "");
    } catch (err: any) {
      setError(err?.message || "Could not connect to the backend.");
    } finally {
      setLoading(false);
    }
  }

  function downloadReport(format: "csv" | "excel" | "pdf") {
    if (!report) {
      setError("Generate the report before downloading.");
      return;
    }

    setDownloading(format);
    setError("");

    try {
      if (format === "csv") {
        downloadBlob("network_commission_report.csv", buildCsv(report), "text/csv;charset=utf-8");
      }

      if (format === "excel") {
        downloadBlob(
          "network_commission_report.xls",
          buildExcelHtml(report),
          "application/vnd.ms-excel;charset=utf-8"
        );
      }

      if (format === "pdf") {
        downloadBlob("network_commission_report.pdf", buildSimplePdf(report), "application/pdf");
      }
    } catch (err: any) {
      setError(err?.message || "Could not download report.");
    } finally {
      setDownloading("");
    }
  }

  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedOrder = useMemo(() => {
    if (!report) return null;
    return report.orders.find((order) => order.order_number === selectedOrderNumber) || report.orders[0] || null;
  }, [report, selectedOrderNumber]);

  const producerOptions = report?.producer_options || [];

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Financial Reports / Network Commission</h1>
          <p style={styles.subtitle}>
            Admin report for 5 percent network commission, 95 percent producer payouts, multi-vendor payment
            distribution, and audit trails.
          </p>
        </div>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.panel}>
        <h2 style={styles.sectionTitle}>Generate Commission Report</h2>

        <div style={styles.filterGrid}>
          <label style={styles.label}>
            Date from
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={styles.input} />
          </label>

          <label style={styles.label}>
            Date to
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={styles.input} />
          </label>

          <label style={styles.label}>
            Producer
            <select value={producer} onChange={(e) => setProducer(e.target.value)} style={styles.input}>
              <option value="all">All producers</option>
              {producerOptions.map((p) => (
                <option key={p.producer_id} value={String(p.producer_id)}>
                  {p.producer_name}
                </option>
              ))}
            </select>
          </label>

          <label style={styles.label}>
            Order status
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={styles.input}>
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="ready">Ready</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
        </div>

        <div style={styles.buttonRow}>
          <button onClick={loadReport} disabled={loading} style={styles.primaryButton}>
            {loading ? "Generating..." : "Generate Report"}
          </button>

          <button onClick={() => downloadReport("csv")} disabled={!!downloading} style={styles.secondaryButton}>
            {downloading === "csv" ? "Downloading..." : "Download CSV"}
          </button>

          <button onClick={() => downloadReport("excel")} disabled={!!downloading} style={styles.secondaryButton}>
            {downloading === "excel" ? "Downloading..." : "Download Excel"}
          </button>

          <button onClick={() => downloadReport("pdf")} disabled={!!downloading} style={styles.secondaryButton}>
            {downloading === "pdf" ? "Downloading..." : "Download PDF"}
          </button>
        </div>
      </div>

      {loading && <p>Loading financial report...</p>}

      {report && (
        <>
          <div style={styles.cardGrid}>
            <div style={styles.card}>
              <div style={styles.cardLabel}>PERIOD ORDER VALUE</div>
              <div style={styles.cardValue}>{currency(report.summary.total_order_value)}</div>
              <div style={styles.cardHint}>
                {report.period.date_from} to {report.period.date_to}
              </div>
            </div>

            <div style={styles.card}>
              <div style={styles.cardLabel}>5 PERCENT NETWORK COMMISSION</div>
              <div style={styles.cardValueGreen}>{currency(report.summary.total_commission)}</div>
              <div style={styles.cardHint}>Calculated to 2 decimal places</div>
            </div>

            <div style={styles.card}>
              <div style={styles.cardLabel}>95 PERCENT PRODUCER PAYOUT</div>
              <div style={styles.cardValue}>{currency(report.summary.total_producer_payout)}</div>
              <div style={styles.cardHint}>Per supplier settlement split</div>
            </div>

            <div style={styles.card}>
              <div style={styles.cardLabel}>ORDERS PROCESSED</div>
              <div style={styles.cardValue}>{report.summary.number_of_orders_processed}</div>
              <div style={styles.cardHint}>Traceable order records</div>
            </div>

            <div style={styles.card}>
              <div style={styles.cardLabel}>MONTH-TO-DATE COMMISSION</div>
              <div style={styles.cardValueGreen}>{currency(report.monthly_summary.month_to_date_commission)}</div>
              <div style={styles.cardHint}>Monthly summary report</div>
            </div>

            <div style={styles.card}>
              <div style={styles.cardLabel}>YEAR-TO-DATE COMMISSION</div>
              <div style={styles.cardValueGreen}>{currency(report.year_to_date_summary.ytd_commission)}</div>
              <div style={styles.cardHint}>Since {report.year_to_date_summary.year_start}</div>
            </div>
          </div>

          <div style={styles.panel}>
            <h2 style={styles.sectionTitle}>Calculation Verification</h2>

            <div style={styles.verifyGrid}>
              <div style={styles.verifyBox}>
                <h3 style={styles.smallTitle}>{currency("100.00")} Single-Producer Example</h3>
                <p>Order total: {currency(report.calculation_checks.single_order_100.order_total)}</p>
                <p>5 percent commission: {currency(report.calculation_checks.single_order_100.commission_5_percent)}</p>
                <p>
                  95 percent producer payment:{" "}
                  {currency(report.calculation_checks.single_order_100.producer_payment_95_percent)}
                </p>
              </div>

              <div style={styles.verifyBox}>
                <h3 style={styles.smallTitle}>{currency("150.00")} Multi-Vendor Example</h3>
                <p>Total commission: {currency(report.calculation_checks.multi_vendor_150.total_commission_5_percent)}</p>
                <p>
                  Producer 1: {currency("80.00")} to{" "}
                  {currency(report.calculation_checks.multi_vendor_150.producer_1_payment_95_percent)}
                </p>
                <p>
                  Producer 2: {currency("70.00")} to{" "}
                  {currency(report.calculation_checks.multi_vendor_150.producer_2_payment_95_percent)}
                </p>
              </div>
            </div>
          </div>

          <div style={styles.panel}>
            <h2 style={styles.sectionTitle}>Breakdown by Order</h2>

            {report.orders.length === 0 ? (
              <p>No orders found for this report filter.</p>
            ) : (
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Order</th>
                      <th style={styles.th}>Date</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Payment</th>
                      <th style={styles.th}>Total</th>
                      <th style={styles.th}>5 percent Commission</th>
                      <th style={styles.th}>Producers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.orders.map((order) => (
                      <tr
                        key={order.order_number}
                        style={{
                          ...styles.clickRow,
                          background: selectedOrderNumber === order.order_number ? "#ecfdf5" : "#fff",
                        }}
                        onClick={() => setSelectedOrderNumber(order.order_number)}
                      >
                        <td style={styles.td}>{order.order_number}</td>
                        <td style={styles.td}>{new Date(order.created_at).toLocaleDateString("en-GB")}</td>
                        <td style={styles.td}>{order.status}</td>
                        <td style={styles.td}>{order.payment_status}</td>
                        <td style={styles.td}>{currency(order.total_amount)}</td>
                        <td style={styles.td}>{currency(order.commission_amount)}</td>
                        <td style={styles.td}>{order.producer_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {selectedOrder && (
            <div style={styles.panel}>
              <h2 style={styles.sectionTitle}>Selected Order Detail: {selectedOrder.order_number}</h2>

              <div style={styles.detailGrid}>
                <div>
                  <strong>Order total:</strong> {currency(selectedOrder.total_amount)}
                </div>
                <div>
                  <strong>Commission calculation:</strong> 5 percent x {currency(selectedOrder.total_amount)} ={" "}
                  {currency(selectedOrder.commission_amount)}
                </div>
                <div>
                  <strong>Payment status:</strong> {selectedOrder.payment_status}
                </div>
                <div>
                  <strong>Customer:</strong> {selectedOrder.customer_email}
                </div>
              </div>

              <h3 style={styles.smallTitle}>Producer payment per supplier</h3>

              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Producer</th>
                      <th style={styles.th}>Sub-order Status</th>
                      <th style={styles.th}>Supplier Subtotal</th>
                      <th style={styles.th}>5 percent Commission</th>
                      <th style={styles.th}>95 percent Producer Payment</th>
                      <th style={styles.th}>Settlement Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.producer_payments.map((producerPayment) => (
                      <tr key={producerPayment.producer_order_id}>
                        <td style={styles.td}>{producerPayment.producer_name}</td>
                        <td style={styles.td}>{producerPayment.producer_order_status}</td>
                        <td style={styles.td}>{currency(producerPayment.subtotal)}</td>
                        <td style={styles.td}>{currency(producerPayment.commission_amount)}</td>
                        <td style={styles.td}>{currency(producerPayment.payout_amount)}</td>
                        <td style={styles.td}>{producerPayment.settlement_status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div style={styles.panel}>
            <h2 style={styles.sectionTitle}>Producer Summary</h2>

            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Producer</th>
                    <th style={styles.th}>Subtotal</th>
                    <th style={styles.th}>Commission</th>
                    <th style={styles.th}>Payout</th>
                    <th style={styles.th}>Settlements</th>
                  </tr>
                </thead>
                <tbody>
                  {report.producer_breakdown.map((producerRow) => (
                    <tr key={producerRow.producer_id}>
                      <td style={styles.td}>{producerRow.producer_name}</td>
                      <td style={styles.td}>{currency(producerRow.total_subtotal)}</td>
                      <td style={styles.td}>{currency(producerRow.total_commission)}</td>
                      <td style={styles.td}>{currency(producerRow.total_payout)}</td>
                      <td style={styles.td}>{producerRow.settlement_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    maxWidth: 1250,
    margin: "0 auto",
    padding: "32px 20px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    marginBottom: 24,
    flexWrap: "wrap",
  },
  title: {
    margin: 0,
    color: "#1b4332",
    fontSize: 32,
  },
  subtitle: {
    marginTop: 8,
    color: "#4b5563",
    maxWidth: 850,
  },
  panel: {
    background: "#ffffff",
    borderRadius: 16,
    padding: 24,
    boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
    border: "1px solid #e5e7eb",
    marginBottom: 24,
  },
  sectionTitle: {
    marginTop: 0,
    color: "#1f2937",
  },
  filterGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
    gap: 14,
    marginBottom: 18,
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    fontSize: 13,
    fontWeight: 700,
    color: "#374151",
  },
  input: {
    padding: "10px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 10,
    fontSize: 14,
  },
  buttonRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  primaryButton: {
    padding: "12px 16px",
    borderRadius: 10,
    border: "none",
    background: "#2d6a4f",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  },
  secondaryButton: {
    padding: "12px 16px",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    background: "#fff",
    color: "#111827",
    fontWeight: 700,
    cursor: "pointer",
  },
  error: {
    marginBottom: 20,
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#991b1b",
    padding: 16,
    borderRadius: 12,
  },
  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
    marginBottom: 28,
  },
  card: {
    background: "#ffffff",
    borderRadius: 16,
    padding: 20,
    boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
    border: "1px solid #e5e7eb",
  },
  cardLabel: {
    color: "#6b7280",
    fontSize: 13,
    fontWeight: 800,
  },
  cardValue: {
    marginTop: 8,
    fontSize: 28,
    fontWeight: 800,
    color: "#111827",
  },
  cardValueGreen: {
    marginTop: 8,
    fontSize: 28,
    fontWeight: 800,
    color: "#1b4332",
  },
  cardHint: {
    marginTop: 4,
    color: "#6b7280",
    fontSize: 13,
  },
  verifyGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 16,
  },
  verifyBox: {
    background: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 16,
  },
  smallTitle: {
    marginTop: 0,
    color: "#1b4332",
  },
  tableWrap: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    textAlign: "left",
    padding: "12px 8px",
    borderBottom: "1px solid #e5e7eb",
    background: "#f9fafb",
    fontSize: 13,
    color: "#374151",
  },
  td: {
    padding: "12px 8px",
    borderBottom: "1px solid #f3f4f6",
    fontSize: 14,
  },
  clickRow: {
    cursor: "pointer",
  },
  detailGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 12,
    marginBottom: 18,
  },
};

export default PaymentsPage;
