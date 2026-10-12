import { useEffect, useState } from "react";
import "./App.css";

const API =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:5000";

export default function App() {
  const [count, setCount] = useState(4);
  const [images, setImages] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadHistory() {
    try {
      const response = await fetch(`${API}/api/history`);

      if (!response.ok) {
        throw new Error("Could not load history.");
      }

      setHistory(await response.json());
    } catch {
      setHistory([]);
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  async function generateFlowers() {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          count: Number(count)
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Image generation failed."
        );
      }

      setImages(data.images);
      setMessage(
        `Successfully generated ${data.count} flower images.`
      );

      await loadHistory();
    } catch (err) {
      setError(
        `${err.message} Make sure the Express API and Python model service are running.`
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <nav className="navbar">
        <a className="brand" href="/">
          <span className="brand-icon">✿</span>
          BloomGAN
        </a>

        <span className="nav-tag">Generative AI Project</span>
      </nav>

      <section className="hero">
        <div className="eyebrow">
          PYTORCH · DCGAN · SYNTHETIC ART
        </div>

        <h1>
          Flowers born from
          <span> artificial intelligence.</span>
        </h1>

        <p className="hero-description">
          Generate new flower images from random latent noise
          using a GAN trained on real flower photographs.
        </p>

        <div className="generator-panel">
          <div className="control-group">
            <label htmlFor="image-count">
              Number of flowers
            </label>

            <select
              id="image-count"
              value={count}
              onChange={(event) =>
                setCount(Number(event.target.value))
              }
              disabled={loading}
            >
              {[1, 4, 8, 12, 16].map((number) => (
                <option key={number} value={number}>
                  {number} image{number > 1 ? "s" : ""}
                </option>
              ))}
            </select>
          </div>

          <button
            className="generate-button"
            onClick={generateFlowers}
            disabled={loading}
          >
            {loading ? "Generating..." : "✦ Generate flowers"}
          </button>
        </div>

        {loading && (
          <p className="status" role="status">
            Your Generator is creating new images...
          </p>
        )}

        {message && (
          <p className="success" role="status">
            {message}
          </p>
        )}

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </section>

      <section className="gallery-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">YOUR CREATIONS</p>
            <h2>Flower gallery</h2>
          </div>

          <span className="image-count">
            {images.length} images
          </span>
        </div>

        {images.length === 0 ? (
          <div className="empty-state">
            <div className="empty-flower">✿</div>
            <h3>Your gallery starts here</h3>
            <p>
              Select how many images you want and click
              Generate flowers.
            </p>
          </div>
        ) : (
          <div className="gallery">
            {images.map((image, index) => (
              <article className="flower-card" key={index}>
                <img
                  src={`data:image/png;base64,${image}`}
                  alt={`AI-generated flower ${index + 1}`}
                />

                <div className="card-footer">
                  <span>
                    Flower {String(index + 1).padStart(2, "0")}
                  </span>

                  <a
                    href={`data:image/png;base64,${image}`}
                    download={`synthetic-flower-${index + 1}.png`}
                    aria-label={`Download flower ${index + 1}`}
                  >
                    Download ↓
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="history-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">ACTIVITY</p>
            <h2>Recent generations</h2>
          </div>
        </div>

        {history.length === 0 ? (
          <p className="history-empty">
            Your successful generation requests will appear here.
          </p>
        ) : (
          <div className="history-list">
            {history.map((item) => (
              <div className="history-item" key={item._id}>
                <span className="history-symbol">✿</span>

                <div className="history-details">
                  <strong>
                    {item.count} flower
                    {item.count > 1 ? " images" : " image"}
                  </strong>

                  <span>
                    {new Date(item.createdAt).toLocaleString()}
                  </span>
                </div>

                <span className="resolution">
                  {item.imageSize} × {item.imageSize}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <footer>
        <span>BloomGAN</span>
        <span>Generated with your trained DCGAN model</span>
      </footer>
    </main>
  );
}