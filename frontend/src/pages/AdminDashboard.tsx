const AdminDashboard = () => {
  const stats = [
    { label: "Total Users", value: "24" },
    { label: "Total Producers", value: "8" },
    { label: "Total Orders", value: "56" },
    { label: "Pending Reviews", value: "5" },
  ];

  const sections = [
    {
      title: "User Management",
      description:
        "View and manage customer, producer, and admin accounts across the platform.",
      action: "Manage Users",
    },
    {
      title: "Producer Management",
      description:
        "Review producer profiles, monitor activity, and check submitted information.",
      action: "View Producers",
    },
    {
      title: "Order Overview",
      description:
        "Track order statuses, payouts, and overall marketplace activity in one place.",
      action: "View Orders",
    },
  ];

  const recentActivity = [
    "New producer account registered",
    "Order #1042 marked as completed",
    "Admin profile updated system settings",
    "Customer account requested support",
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f5f7f4",
        padding: "2rem",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            marginBottom: "2rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "2.4rem",
                margin: 0,
                marginBottom: "0.5rem",
                color: "#1f4d3a",
              }}
            >
              Admin Dashboard
            </h1>
            <p
              style={{
                margin: 0,
                color: "#4b5563",
                fontSize: "1rem",
                maxWidth: "700px",
                lineHeight: "1.6",
              }}
            >
              Welcome, admin. Use this dashboard to monitor platform activity,
              review marketplace data, and manage key areas of the system.
            </p>
          </div>

          <div
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "12px",
              padding: "1rem 1.25rem",
              minWidth: "220px",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "0.9rem",
                color: "#6b7280",
              }}
            >
              System Status
            </p>
            <h3
              style={{
                margin: "0.45rem 0 0 0",
                color: "#1f4d3a",
                fontSize: "1.2rem",
              }}
            >
              Operational
            </h3>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1rem",
            marginBottom: "2rem",
          }}
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "12px",
                padding: "1.25rem",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
                border: "1px solid #e5e7eb",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: "0.95rem",
                  color: "#6b7280",
                }}
              >
                {stat.label}
              </p>
              <h2
                style={{
                  margin: "0.5rem 0 0 0",
                  fontSize: "2rem",
                  color: "#1f4d3a",
                }}
              >
                {stat.value}
              </h2>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: "1.5rem",
            alignItems: "start",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "1.5rem",
            }}
          >
            {sections.map((section) => (
              <div
                key={section.title}
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "12px",
                  padding: "1.5rem",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
                  border: "1px solid #e5e7eb",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  minHeight: "220px",
                }}
              >
                <div>
                  <h2
                    style={{
                      fontSize: "1.3rem",
                      margin: 0,
                      marginBottom: "0.75rem",
                      color: "#1f4d3a",
                    }}
                  >
                    {section.title}
                  </h2>
                  <p
                    style={{
                      color: "#4b5563",
                      lineHeight: "1.6",
                      margin: 0,
                    }}
                  >
                    {section.description}
                  </p>
                </div>

                <button
                  type="button"
                  style={{
                    marginTop: "1.5rem",
                    backgroundColor: "#1f4d3a",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "0.8rem 1rem",
                    fontSize: "0.95rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {section.action}
                </button>
              </div>
            ))}
          </div>

          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              padding: "1.5rem",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
              border: "1px solid #e5e7eb",
            }}
          >
            <h2
              style={{
                margin: 0,
                marginBottom: "1rem",
                fontSize: "1.25rem",
                color: "#1f4d3a",
              }}
            >
              Recent Activity
            </h2>

            <div style={{ display: "grid", gap: "0.9rem" }}>
              {recentActivity.map((item, index) => (
                <div
                  key={index}
                  style={{
                    paddingBottom: "0.9rem",
                    borderBottom:
                      index !== recentActivity.length - 1
                        ? "1px solid #e5e7eb"
                        : "none",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      color: "#374151",
                      lineHeight: "1.5",
                      fontSize: "0.95rem",
                    }}
                  >
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;