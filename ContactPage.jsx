// ContactPage.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./ContactPage.css";

export default function ContactPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [popup, setPopup] = useState({ show: false, message: "", type: "" });
  const [fadeOut, setFadeOut] = useState(false);
  const [sending, setSending] = useState(false);

  // Update form input values
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);

    try {
      const res = await fetch("http://localhost:5001/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      // Show popup based on response
      if (res.ok) {
        setPopup({ show: true, message: "Message sent successfully!", type: "success" });
        setFormData({ name: "", email: "", message: "" });
      } else {
        setPopup({ show: true, message: data.message || "Failed to send message.", type: "error" });
      }
    } catch (err) {
      setPopup({ show: true, message: "Error sending message.", type: "error" });
    } finally {
      setSending(false);
    }
  };

  // Close popup
  const handlePopupOK = () => {
    setFadeOut(true);
    setTimeout(() => {
      setPopup({ show: false, message: "", type: "" });
      setFadeOut(false);
    }, 350);
  };

  return (
    <div className="contact-overlay">
      <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>

      <div className="contact-card">
        <h1>
          Contact <span className="purple-text">Soluna</span>
        </h1>
        <p className="contact-intro">
          We'd love to hear from you. Send us a message or reach out via email!
        </p>

        <form className="contact-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              name="name"
              placeholder="Enter your name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Message</label>
            <textarea
              name="message"
              placeholder="Type your message..."
              value={formData.message}
              onChange={handleChange}
              required
              rows={8}
            />
          </div>

          <button type="submit">{sending ? "Sending..." : "Send Message"}</button>
        </form>

        <div className="email-link">
          <p>
            <span className="dark-text">Prefer direct email? </span>
            <a
              href="https://mail.google.com/mail/?view=cm&fs=1&to=wellnessSoluna@gmail.com"
              target="_blank"
              rel="noreferrer"
              className="purple-text"
              style={{ textDecoration: "underline" }}
            >
              wellnessSoluna@gmail.com
            </a>
          </p>
        </div>
      </div>

      {popup.show && (
        <div className={`popup-overlay ${fadeOut ? "" : "show"}`}>
          <div className={`popup-card ${popup.type}`}>
            <div className="popup-icon">{popup.type === "success" ? "✓" : "⚠"}</div>
            <p className="popup-message">{popup.message}</p>
            <button className="popup-btn" onClick={handlePopupOK}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}
