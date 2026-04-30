import React, { useEffect, useMemo, useState } from "react";
import { CloudSun, MapPin, MessageCircle, RefreshCw, Send } from "lucide-react";
import { fetchParkData, fetchWeather, sendChatMessage } from "./api";
import { FreshnessBadge } from "./components/FreshnessBadge";
import { DataStatusBanner } from "./components/DataStatusBanner";
import { getNextBestRides } from "./rideRecommendations";
{ id: "magic_kingdom", name: "Magic Kingdom" },
  { id: "epcot", name: "EPCOT" },
  { id: "hollywood", name: "Hollywood Studios" },
  { id: "animal_kingdom", name: "Animal Kingdom" },
  { id: "universal_sf", name: "Universal Studios Florida" },
  { id: "islands", name: "Islands of Adventure" },
  { id: "epic_universe", name: "Epic Universe" },
];

const page = {
  minHeight: "100vh",
  background: "linear-gradient(180deg, #fff7ed 0%, #f8fafc 100%)",
  fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
  color: "#0f172a",
};

const shell = { maxWidth: 900, margin: "0 auto", padding: 18 };
const card = { background: "rgba(255,255,255,.92)", border: "1px solid #e2e8f0", borderRadius: 22, padding: 16, boxShadow: "0 10px 30px rgba(15,23,42,.08)", marginBottom: 14 };
const button = { border: "1px solid #e2e8f0", background: "white", borderRadius: 999, padding: "9px 12px", fontWeight: 800, cursor: "pointer" };

function App() {
  const [activePark, setActivePark] = useState("magic_kingdom");
  const [parkData, setParkData] = useState(null);
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [park, weatherData] = await Promise.all([
        fetchParkData(activePark),
        fetchWeather(),
      ]);
      setParkData(park);
      setWeather(weatherData);
    } catch (err) {
      setError(err.message || "Could not load app data.");
    } finally {
      setLoading(false);
    }
  }

 useEffect(() => {
  loadData();
}, [activePark]);   
  

  const sortedRides = useMemo(() => {
   const recommendations = useMemo(() => {
  return getNextBestRides({
    parkId: activePark,
    rides: parkData?.rides || [],
    weather,
  });
}, [activePark, parkData, weather]);    return [...(parkData?.rides || [])].sort((a, b) => (b.waitTime || 0) - (a.waitTime || 0));
  }, [parkData]);

  async function handleChatSubmit(e) {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) return;

    const nextChat = [...chat, { role: "user", content: trimmed }];
    setChat(nextChat);
    setMessage("");
    setChatLoading(true);

    try {
      const res = await sendChatMessage(trimmed, {
        activePark,
        weather,
        conversationHistory: nextChat.slice(-6),
      });
      setChat([...nextChat, { role: "assistant", content: res.reply }]);
    } catch {
      setChat([...nextChat, { role: "assistant", content: "I had trouble connecting to AI chat. Try again in a minute." }]);
    } finally {
      setChatLoading(false);
    }
  }

  return (
    <main style={page}>
      <div style={shell}>
        <header style={{ padding: "18px 0" }}>
          <h1 style={{ fontSize: 36, margin: 0, letterSpacing: -1 }}>ParkPlan AI</h1>
          <p style={{ color: "#64748b", marginTop: 6 }}>Smart park planning for Disney World and Universal Orlando.</p>
        </header>

        <section style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <MapPin size={18} />
                <h2 style={{ margin: 0, fontSize: 18 }}>{parkData?.parkName || "Choose a park"}</h2>
                <FreshnessBadge source={parkData?.source} ageMs={parkData?.ageMs} fetchedAt={parkData?.fetchedAt} />
              </div>
              <p style={{ margin: "7px 0 0", color: "#64748b", fontSize: 13 }}>{sortedRides.length} rides loaded</p>
            </div>
            <button style={button} onClick={loadData} disabled={loading}>
              <RefreshCw size={14} /> {loading ? "Loading" : "Refresh"}
            </button>
          </div>
          <DataStatusBanner source={parkData?.source} />
          {error && <p style={{ color: "#b91c1c", fontWeight: 700 }}>{error}</p>}
        </section>
<section style={card}>
  <h3 style={{ marginTop: 0 }}>Best Move Right Now</h3>

  {recommendations.bestMove ? (
    <div style={{ display: "grid", gap: 10 }}>
      <div
        style={{
          padding: 14,
          borderRadius: 18,
          border: "1px solid #bbf7d0",
          background: "#f0fdf4",
        }}
      >
        <div style={{ fontSize: 12, color: "#166534", fontWeight: 900 }}>
          BEST MOVE
        </div>
        <h4 style={{ margin: "4px 0", fontSize: 20 }}>
          {recommendations.bestMove.name}
        </h4>
        <p style={{ margin: 0, color: "#166534", fontWeight: 800 }}>
          {recommendations.bestMove.waitTime} min wait
        </p>
        <p style={{ margin: "8px 0 0", color: "#334155" }}>
          Why: {recommendations.bestMove.reason}.
        </p>
      </div>

      {recommendations.backup && (
        <div
          style={{
            padding: 14,
            borderRadius: 18,
            border: "1px solid #bfdbfe",
            background: "#eff6ff",
          }}
        >
          <div style={{ fontSize: 12, color: "#1d4ed8", fontWeight: 900 }}>
            SMART BACKUP
          </div>
          <h4 style={{ margin: "4px 0", fontSize: 18 }}>
            {recommendations.backup.name}
          </h4>
          <p style={{ margin: 0, color: "#1d4ed8", fontWeight: 800 }}>
            {recommendations.backup.waitTime} min wait
          </p>
          <p style={{ margin: "8px 0 0", color: "#334155" }}>
            Why: {recommendations.backup.reason}.
          </p>
        </div>
      )}

      {recommendations.waitOnThis && (
        <div
          style={{
            padding: 14,
            borderRadius: 18,
            border: "1px solid #fed7aa",
            background: "#fff7ed",
          }}
        >
          <div style={{ fontSize: 12, color: "#9a3412", fontWeight: 900 }}>
            WAIT ON THIS
          </div>
          <h4 style={{ margin: "4px 0", fontSize: 18 }}>
            {recommendations.waitOnThis.name}
          </h4>
          <p style={{ margin: 0, color: "#9a3412", fontWeight: 800 }}>
            {recommendations.waitOnThis.waitTime} min wait
          </p>
          <p style={{ margin: "8px 0 0", color: "#334155" }}>
            Great ride, but the current wait makes it a weaker value right now.
          </p>
        </div>
      )}
    </div>
  ) : (
    <p style={{ color: "#64748b" }}>Loading recommendations...</p>
  )}
</section>        <section style={card}>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
            {PARKS.map((park) => (
              <button
                key={park.id}
                onClick={() => setActivePark(park.id)}
                style={{
                  ...button,
                  background: activePark === park.id ? "#0f172a" : "white",
                  color: activePark === park.id ? "white" : "#0f172a",
                  whiteSpace: "nowrap",
                }}
              >
                {park.name}
              </button>
            ))}
          </div>
        </section>

        <section style={card}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <CloudSun size={18} />
              <strong>Orlando Weather</strong>
            </div>
            <FreshnessBadge source={weather?.source} ageMs={weather?.ageMs} fetchedAt={weather?.fetchedAt} />
          </div>
          <p style={{ margin: "10px 0 0", color: "#334155" }}>
            {weather?.tempF ? `${weather.tempF}°F · ` : ""}{weather?.summary || "Loading weather..."}
            {weather?.stormMode ? " · Storm Mode active" : ""}
          </p>
          <DataStatusBanner source={weather?.source} />
        </section>

        <section style={card}>
          <h3 style={{ marginTop: 0 }}>Wait Times</h3>
          <div style={{ display: "grid", gap: 10 }}>
            {sortedRides.map((ride) => (
              <div key={ride.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: 12, border: "1px solid #e2e8f0", borderRadius: 16 }}>
                <div>
                  <strong>{ride.name}</strong>
                  <div style={{ color: "#64748b", fontSize: 12 }}>{ride.land} · {ride.isOpen ? "Open" : "Closed"}</div>
                </div>
                <div style={{ fontWeight: 900 }}>{ride.waitTime} min</div>
              </div>
            ))}
          </div>
        </section>

        <section style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <MessageCircle size={18} />
            <h3 style={{ margin: 0 }}>AI Park Assistant</h3>
          </div>
          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            {chat.length === 0 && <p style={{ color: "#64748b" }}>Ask what to ride next, how to handle weather, or how to plan your afternoon.</p>}
            {chat.map((msg, idx) => (
              <div key={idx} style={{ padding: 10, borderRadius: 14, background: msg.role === "user" ? "#e0f2fe" : "#f1f5f9" }}>
                <strong>{msg.role === "user" ? "You" : "ParkPlan AI"}: </strong>{msg.content}
              </div>
            ))}
          </div>
          <form onSubmit={handleChatSubmit} style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Ask ParkPlan AI..." style={{ flex: 1, border: "1px solid #cbd5e1", borderRadius: 999, padding: "10px 12px" }} />
            <button style={button} disabled={chatLoading}><Send size={14} /> {chatLoading ? "..." : "Send"}</button>
          </form>
        </section>
      </div>
    </main>
  );
}

export default App;
