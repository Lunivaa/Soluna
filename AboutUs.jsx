import React from "react";
import { useNavigate } from "react-router-dom";
import "./AboutUs.css";

export default function AboutUs() {
  const navigate = useNavigate(); // Initialize navigation

  const handleBack = () => {
    navigate(-1); // Go back to previous page
  };

  return (
    <div className="about-overlay">
      <button className="back-btn" onClick={handleBack}>
        ← Back
      </button>

      <div className="about-card" role="region" aria-labelledby="about-title">
        <h1 id="about-title">
          About <span>Soluna</span>
        </h1>

        <p className="about-intro">
          Soluna is a calm digital sanctuary designed to help individuals become more 
          aware of their emotions, reflect with kindness, and cultivate lasting coping 
          skills. By combining mood logging, contextual affirmations, private journaling, 
          an empathetic conversational guide, curated self-care activities, and clear 
          progress visualizations, Soluna empowers users to engage in self-reflection 
          and personal growth in a supportive, accessible environment. Each feature 
          is thoughtfully created to be simple, engaging, and intuitive, transforming 
          small, daily practices into meaningful steps toward emotional resilience, 
          mental clarity, and overall wellbeing. Soluna is more than just a platform— 
          it's a companion that guides users toward balance, self-awareness, and 
          lifelong mental wellness.
        </p>

        <div className="about-grid">
          <div className="about-box">
            <h2>🌱 Our Mission</h2>
            <p>
              To gently guide individuals on their journey of self-discovery and emotional balance.
              We aim to remove the stigma around mental health by creating a welcoming digital space where people can openly reflect, 
              track their emotions, and nurture daily habits of care.
              Our mission is to turn small, consistent actions — like writing a journal entry or pausing for mindful breathing — 
              into meaningful steps toward long-term resilience and healing.
            </p>
          </div>

          <div className="about-box">
            <h2>🌸 Our Vision</h2>
            <p>
             A world where caring for the mind is as natural as caring for the body.
             We envision communities where conversations about feelings are normalized, and people feel supported, not judged.
             Through technology that is empathetic, accessible, and beautifully simple, 
             we dream of giving every individual the confidence to say: “I am in touch with myself, and I am growing stronger each day.”
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
