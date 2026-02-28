import React, { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import "./HomePage.css";
import logo from "./assets/logo.png";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { jwtDecode } from "jwt-decode"; // ← ONLY THIS LINE CHANGED

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const HomePage = () => {
  const [userName, setUserName] = useState("Luniva");
  const [userInitial, setUserInitial] = useState("L");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token); // ← ONLY THIS LINE CHANGED (jwtDecode instead of jwt.decode)

        if (decoded && decoded.name) {
          const firstName = decoded.name.trim().split(" ")[0];
          setUserName(firstName);
          setUserInitial(firstName.charAt(0).toUpperCase());
        } else if (decoded && decoded.email) {
          const nameFromEmail = decoded.email.split("@")[0];
          const firstName = nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1);
          setUserName(firstName);
          setUserInitial(firstName.charAt(0).toUpperCase());
        }
      } catch (err) {
        console.error("Failed to decode token");
      }
    }
  }, []);

  const moodData = {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [
      {
        label: "Mood Level",
        data: [3, 4, 4.5, 5, 3.5, 4.8, 5],
        borderColor: "#9565B8",
        backgroundColor: "rgba(149,101,184,0.2)",
        fill: true,
        tension: 0.4,
        pointRadius: 5,
        pointBackgroundColor: "#9565B8",
      },
    ],
  };

  const moodOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: { min: 0, max: 6, ticks: { stepSize: 1, color: "#555555" }, grid: { color: "#555555" } },
      x: { ticks: { color: "#555555" }, grid: { color: "#555555" } },
    },
    plugins: { legend: { display: false } },
  };

  const quickAccessItems = [
    { title: "Journaling", desc: "Reflect on your thoughts and feelings in a private space." },
    { title: "Mood Tracking", desc: "Monitor your emotional well-being over time and identify patterns." },
    { title: "Chatbot Support", desc: "Engage in supportive conversations with our AI companion." },
    { title: "Self-Care Library", desc: "Discover curated resources for mental wellness and personal growth." },
    { title: "Progress Reports", desc: "Visualize your journey and gain insights into your well-being." },
    { title: "My Profile", desc: "Manage your personal information, settings, and preferences." },
  ];

  return (
    <div className="homepage">
      {/* Navbar */}
      <nav className="navbar">
        <img src={logo} alt="Soluna Logo" className="nav-logo" />
        <ul className="nav-links">
          <li>
            <NavLink to="/home" end className={({ isActive }) => (isActive ? "active" : "")}>
              Home
            </NavLink>
          </li>
          <li>
            <NavLink to="/mood" className={({ isActive }) => (isActive ? "active" : "")}>
              Mood Tracking
            </NavLink>
          </li>
          <li>
            <NavLink to="/journal" className={({ isActive }) => (isActive ? "active" : "")}>
              Journal
            </NavLink>
          </li>
          <li>
            <NavLink to="/chatbot" className={({ isActive }) => (isActive ? "active" : "")}>
              Chatbot
            </NavLink>
          </li>
          <li>
            <NavLink to="/libraries" className={({ isActive }) => (isActive ? "active" : "")}>
              Libraries
            </NavLink>
          </li>
          <li>
            <NavLink to="/reports" className={({ isActive }) => (isActive ? "active" : "")}>
              Reports
            </NavLink>
          </li>
        </ul>
        <div className="profile-circle">{userInitial}</div>
      </nav>

      {/* Welcome Section */}
      <section className="welcome-section">
        <h1>Hello, {userName}!</h1>
        <p>Your feelings are valid, and your journey matters.</p>
        <button className="log-mood-btn">Log My Mood</button>
      </section>

      {/* Wellness Overview */}
      <section className="wellness-overview">
        <h2>Your Wellness Overview</h2>
        <div className="overview-grid">
          <div className="mood-trends">
            <h3>Mood Trends</h3>
            <div className="chart-container">
              <Line data={moodData} options={moodOptions} />
            </div>
          </div>
          <div className="recent-reflections">
            <h3>Recent Reflections</h3>
            <p>
              <strong>Today:</strong> Felt grateful for small wins. Evening walk helped me relax.
            </p>
            <p>
              <strong>Yesterday:</strong> Busy day but mindfulness helped me stay calm.
            </p>
            <p>
              <strong>2 days ago:</strong> Focused on journaling and self-reflection.
            </p>
            <button className="view-entries-btn">View All Entries</button>
          </div>
        </div>
      </section>

      {/* Quick Access */}
      <section className="quick-access">
        <h2>Quick Access</h2>
        <div className="quick-grid">
          {quickAccessItems.map((item, index) => (
            <div className="quick-card" key={index}>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
              <button>Explore</button>
            </div>
          ))}
        </div>
      </section>

      {/* Mindfulness Section */}
      <section className="discover-section">
        <div className="discover-card">
          <img src="/images/Mindfulness.png" alt="Mindfulness" />
          <div className="discover-content">
            <h3>Mindfulness for Beginners</h3>
            <p>
              Learn simple mindfulness techniques to reduce stress and enhance daily life.
              Includes breathing exercises, guided meditations, and practical tips.
            </p>
            <button>Explore Resource</button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;