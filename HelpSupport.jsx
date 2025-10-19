import React from "react";
import { useNavigate } from "react-router-dom";
import "./HelpSupport.css";

export default function HelpSupport() {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1); // Go back to previous page exactly
  };

  // Frequently asked questions
  const faqs = [
    {
      question: "How do I track my mood?",
      answer: "You can track your mood in the “Mood Tracker” section, log your daily emotions."
    },
    {
      question: "Can I export the journal?",
      answer: "Export your journal from Settings → Journal → Export as PDF."
    },
    {
      question: "Is my data secure?",
      answer: "Soluna uses end-to-end encryption and follows strict security protocols to protect your data."
    },
    {
      question: "How do I change my password?",
      answer: "Go to Settings → Account → Change Password and follow the instructions."
    },
    {
      question: "How do I view my progress report?",
      answer: "Check the “Progress” section in your dashboard for charts and summaries, only if you have granted permission."
    },
    {
      question: "How does the chatbot help me?",
      answer: "The chatbot acts as a supportive friend: it is empathetic, listens to your inputs, and guides you with helpful tips and affirmations whenever you need support."
    }
  ];

  return (
    <div className="help-overlay">
      <button className="help-back-btn" onClick={handleBack}>← Back</button>

      <div className="help-card" role="region" aria-labelledby="help-title">
        <h1 id="help-title">Help & Support</h1>
        <p className="help-intro">
          Find answers to common questions below or contact our support team if you need more help.
        </p>

        <div className="faq-grid">
          {faqs.map((faq, i) => (
            <div className="faq-box" key={i}>
              <h2>{faq.question}</h2>
              <p>{faq.answer}</p>
            </div>
          ))}
        </div>

        <div className="contact-section">
          <button
            className="contact-btn"
            onClick={() =>
              window.open(
                "https://mail.google.com/mail/?view=cm&fs=1&to=wellnesssoluna@gmail.com",
                "_blank"
              )
            }
          >
            Get in Touch
          </button>
        </div>
      </div>
    </div>
  );
}
