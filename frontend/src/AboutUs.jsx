import React from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiShield, FiSearch, FiHeart, FiCheckCircle } from "react-icons/fi";
import "./AboutUs.css";

export default function AboutUs() {
  const navigate = useNavigate(); // Initialize navigation

  const handleBack = () => {
    navigate(-1); // Go back to previous page
  };

  return (
    <div className="about-overlay">
      <button className="back-btn" onClick={handleBack}>
        <FiArrowLeft /> Back
      </button>

      <div className="about-card" role="region" aria-labelledby="about-title">
        <h1 id="about-title">
          About <span>Soluna</span>
        </h1>

        <p className="about-intro">
          Soluna is a calm digital sanctuary built for you—wherever you are on your
          mental wellness journey. We provide a quiet space to help you become more aware of your
          emotions, reflect with kindness, and cultivate lasting coping skills. By focusing
          on the power of consistent, daily habits, Soluna empowers you to
          take small but meaningful steps toward self-discovery and emotional resilience in
          a supportive, secure environment.
        </p>

        <div className="about-grid">
          <div className="about-box">
            <div className="about-box-header">
              <FiSearch className="about-icon" />
              <h2>Thoughtfully Built</h2>
            </div>
            <p>
              Our tools are rooted in mindful living and healthy mental habits. We translate proven
              wellness concepts into practical, everyday exercises that help you understand
              your patterns and feel better.
            </p>
            <button className="about-science-link" onClick={() => navigate("/science")}>
              View Research Proof &rarr;
            </button>
          </div>

          <div className="about-box">
            <div className="about-box-header">
              <FiShield className="about-icon" />
              <h2>Privacy First</h2>
            </div>
            <p>
              Your journey is yours alone. Soluna uses industry-standard encryption
              to ensure your data remains private and secure. We are committed to transparency and
              never sell your personal information—your trust is our core foundation.
            </p>
          </div>

          <div className="about-box">
            <div className="about-box-header">
              <FiCheckCircle className="about-icon" />
              <h2>Curated Support</h2>
            </div>
            <p>
              All mindfulness content, including meditation and breathing exercises, is
              thoughtfully researched and curated for its effectiveness in
              promoting emotional clarity and reducing daily stress through consistent practice.
            </p>
          </div>

          <div className="about-box">
            <div className="about-box-header">
              <FiHeart className="about-icon" />
              <h2>Self-Guided</h2>
            </div>
            <p>
              Soluna is a self-guided companion designed to complement your
              wellness journey. We provide the tools and space, while you lead the way,
              turning self-reflection into a powerful, life-long personal skill.
            </p>
          </div>
        </div>

        <p className="about-disclaimer">
          <strong>Note:</strong> Soluna is a self-guided companion for your well-being. Not a substitute for clinical 
          or medical help.
        </p>
      </div>
    </div>
  );
}
