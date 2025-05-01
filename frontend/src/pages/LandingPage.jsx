import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/matrix.css"; 

const LandingPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const canvas = document.getElementById("matrixCanvas");
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const letters = "010101101 REBEL RESIST REVOLT 01101001".split("");
    const fontSize = 16;
    const columns = canvas.width / fontSize;
    const drops = Array(Math.floor(columns)).fill(1);

    function drawMatrix() {
      ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#00ff00";
      ctx.font = `${fontSize}px 'Share Tech Mono'`;

      drops.forEach((y, i) => {
        const text = letters[Math.floor(Math.random() * letters.length)];
        ctx.fillText(text, i * fontSize, y * fontSize);
        if (y * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      });
    }
    const interval = setInterval(drawMatrix, 50);
    return () => clearInterval(interval);
  }, []);

  const handleJoin = async () => {
    try {
      const response = await axios.post("http://localhost:5000/api/auth/guest");
      const { token, username } = response.data;
      localStorage.setItem("jwt", token);
      localStorage.setItem("username", username);
      navigate("/dashboard");
    } catch (error) {
      console.error("Authentication failed:", error);
    }
  };

  return (
    <div className="matrix-bg">
      <canvas id="matrixCanvas"></canvas>
      <section className="wf-showcase">
        <h1 className="glitch">Resist. Reveal. Revolt.</h1>
        <h3 className="glitch">This is a Revolution.</h3>
        <button className="wf-btn" onClick={handleJoin}>Join</button>
      </section>
    </div>
  );
};

export default LandingPage;