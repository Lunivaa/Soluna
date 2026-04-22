import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiBookOpen, FiActivity, FiMessageCircle, FiEdit3, FiSun, FiSearch } from "react-icons/fi";
import "./SciencePage.css";

export default function SciencePage() {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
  };

  const researchSections = [
    {
      id: "conversational",
      title: "Automated CBT Support",
      icon: <FiMessageCircle />,
      content: "Soluna’s conversational companion is grounded in research showing that fully automated agents can successfully deliver Cognitive Behavior Therapy (CBT) principles and provide consistent, non-judgmental support.",
      references: [
        "Fitzpatrick, K.K., et al. (2017). Delivering cognitive behavior therapy to young adults using a fully automated conversational agent (Woebot). JMIR Mental Health."
      ]
    },
    {
      id: "journaling",
      title: "The Journaling Method",
      icon: <FiEdit3 />,
      content: "Expressive writing is one of the most studied wellness interventions. Research indicates that documenting emotional experiences leads to improved physical and psychological health.",
      references: [
        "Niles, A.N., et al. (2013). Randomized controlled trial of expressive writing for psychological and physical health. Anxiety, Stress, & Coping."
      ]
    },
    {
      id: "art",
      title: "Digital Art Therapy",
      icon: <FiBookOpen />,
      content: "Our Creative Canvas brings the benefits of art therapy into the digital realm, providing a unique medium for visual self-expression and emotional regulation.",
      references: [
        "Zubala, A., et al. (2021). Art therapy in the digital world: An integrative review of current practice and future directions. Frontiers in Psychology."
      ]
    },
    {
      id: "awareness",
      title: "Awareness & Affirmations",
      icon: <FiSun />,
      content: "Mood tracking and positive affirmations are powerful tools for cognitive reframing, helping the brain move from a reactive state to a reflective state.",
      references: [
        "Schueller, S.M., et al. (2021). Understanding people’s use of and perspectives on mood-tracking apps. JMIR Mental Health.",
        "Raka, S. (2023). Nurturing the mind: The power of positive affirmations. American Journal of Philological Sciences."
      ]
    },
    {
      id: "digital",
      title: "Smartphone Efficacy",
      icon: <FiActivity />,
      content: "Meta-analyses demonstrate that smartphone-based interventions are effective in reducing symptoms and promoting mental well-being in the general population.",
      references: [
        "Firth, J., et al. (2017). The efficacy of smartphone‐based mental health interventions for depressive symptoms: A meta‐analysis. World Psychiatry."
      ]
    },
    {
      id: "wellbeing",
      title: "Digital Interventions",
      icon: <FiSearch />,
      content: "Fully automated digital interventions are validated as effective tools for promoting mental well-being across diverse populations.",
      references: [
        "Groot, J., et al. (2023). The effectiveness of fully automated digital interventions in promoting mental well-being. JMIR Mental Health."
      ]
    }
  ];

  return (
    <div className="science-overlay">
      <div className="science-page">
        <div className="science-navbar">
          <button className="science-back-btn" onClick={handleBack}>
            <FiArrowLeft /> Back
          </button>
          <div className="science-brand">
            Scientific <span>Foundation</span>
          </div>
        </div>

        <header className="science-header">
          <div className="science-header-content">
            <h1>Built on <span>Evidence</span></h1>
            <p>
              Soluna is more than a digital companion. Our features are designed based on 
              peer-reviewed research and established clinical methodologies to ensure 
              meaningful support for your wellness journey.
            </p>
          </div>
        </header>

        <main className="science-main">
          <div className="science-grid">
            {researchSections.map((section) => (
              <section key={section.id} className="research-box">
                <div className="research-icon-wrap">
                  {section.icon}
                </div>
                <div className="research-content">
                  <h2>{section.title}</h2>
                  <p>{section.content}</p>
                  <div className="reference-list">
                    <h4>Key Reference:</h4>
                    <ul>
                      {section.references.map((ref, idx) => (
                        <li key={idx}>{ref}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>
            ))}
          </div>

          <section className="full-references">
            <div className="references-header">
              <FiBookOpen className="ref-icon" />
              <h3>Core Bibliography</h3>
            </div>
            <div className="ref-grid">
              <div className="ref-item">
                Firth, J., et al. (2017) ‘The efficacy of smartphone‐based mental health interventions for depressive symptoms: A meta‐analysis’, World Psychiatry.
              </div>
              <div className="ref-item">
                Fitzpatrick, K.K., et al. (2017) ‘Delivering cognitive behavior therapy using a fully automated conversational agent (Woebot)’, JMIR Mental Health.
              </div>
              <div className="ref-item">
                Groot, J., et al. (2023) ‘The effectiveness of fully automated digital interventions in promoting mental well-being’, JMIR Mental Health.
              </div>
              <div className="ref-item">
                Niles, A.N., et al. (2013) ‘Randomized controlled trial of expressive writing for psychological and physical health’, Anxiety, Stress, & Coping.
              </div>
              <div className="ref-item">
                Schueller, S.M., et al. (2021) ‘Understanding people’s use of and perspectives on mood-tracking apps’, JMIR Mental Health.
              </div>
              <div className="ref-item">
                Zubala, A., et al. (2021) ‘Art therapy in the digital world: An integrative review’, Frontiers in Psychology.
              </div>
            </div>
          </section>
        </main>

        <footer className="science-footer">
          <p>&copy; {new Date().getFullYear()} Soluna Science. All research cited is publicly available via the links provided in our bibliography.</p>
        </footer>
      </div>
    </div>
  );
}
