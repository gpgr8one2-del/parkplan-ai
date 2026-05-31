import React from "react";

export function WaitTimesList({
  rides,
  activeRideId,
  activePark,
  card,
  formatLandLabel,
  renderShowtimeInfo,
  renderRideActions,
}) {
  return (
    <section style={card}>
      <h3 style={{ marginTop: 0 }}>Wait Times</h3>

      <p style={{ marginTop: -4, color: "#64748b", fontSize: 13 }}>
        Riding something that is not on a recommendation card? Mark it here so
        TOHI can keep up with your real day.
      </p>

      <div style={{ display: "grid", gap: 10 }}>
        {rides.map((ride) => {
          const isActiveRide = activeRideId === String(ride.id);

          return (
            <div
              key={ride.id}
              style={{
                padding: 12,
                border: isActiveRide ? "1px solid #c4b5fd" : "1px solid #e2e8f0",
                borderRadius: 16,
                background: isActiveRide ? "#f5f3ff" : "white",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <strong>{ride.name}</strong>
                  <div style={{ color: "#64748b", fontSize: 12 }}>
                    {formatLandLabel(activePark, ride.land)} · {ride.isOpen ? "Open" : "Closed"}
                  </div>
                </div>

                <div style={{ fontWeight: 900, whiteSpace: "nowrap" }}>
                  {ride.waitTime} min
                </div>
              </div>

              {renderShowtimeInfo(ride)}
              {renderRideActions(ride)}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default WaitTimesList;
