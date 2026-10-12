from pathlib import Path
from io import BytesIO
import base64

import torch
import torch.nn as nn
from PIL import Image
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field


# -----------------------------
# Configuration
# -----------------------------
BASE_DIR = Path(__file__).resolve().parent
CHECKPOINT_PATH = (
    BASE_DIR / "models" / "generator_latest.pth"
)

LATENT_DIM = 100
NGF = 64
IMAGE_SIZE = 64

device = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)


# -----------------------------
# Generator
# Must match the Colab model
# -----------------------------
class Generator(nn.Module):
    def __init__(self):
        super().__init__()

        self.network = nn.Sequential(
            nn.ConvTranspose2d(
                LATENT_DIM, NGF * 8, 4, 1, 0, bias=False
            ),
            nn.BatchNorm2d(NGF * 8),
            nn.ReLU(True),

            nn.ConvTranspose2d(
                NGF * 8, NGF * 4, 4, 2, 1, bias=False
            ),
            nn.BatchNorm2d(NGF * 4),
            nn.ReLU(True),

            nn.ConvTranspose2d(
                NGF * 4, NGF * 2, 4, 2, 1, bias=False
            ),
            nn.BatchNorm2d(NGF * 2),
            nn.ReLU(True),

            nn.ConvTranspose2d(
                NGF * 2, NGF, 4, 2, 1, bias=False
            ),
            nn.BatchNorm2d(NGF),
            nn.ReLU(True),

            nn.ConvTranspose2d(
                NGF, 3, 4, 2, 1, bias=False
            ),
            nn.Tanh()
        )

    def forward(self, z):
        return self.network(z)


# -----------------------------
# Load trained weights once
# -----------------------------
if not CHECKPOINT_PATH.is_file():
    raise FileNotFoundError(
        f"Generator checkpoint not found: {CHECKPOINT_PATH}"
    )

generator = Generator().to(device)

state_dict = torch.load(
    CHECKPOINT_PATH,
    map_location=device,
    weights_only=True
)

generator.load_state_dict(state_dict)
generator.eval()


# -----------------------------
# API
# -----------------------------
app = FastAPI(
    title="Synthetic Flower GAN API",
    version="1.0.0"
)


class GenerateRequest(BaseModel):
    count: int = Field(default=4, ge=1, le=16)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": True,
        "device": str(device),
        "image_size": IMAGE_SIZE
    }


@app.post("/generate")
def generate(request: GenerateRequest):
    try:
        with torch.inference_mode():
            noise = torch.randn(
                request.count,
                LATENT_DIM,
                1,
                1,
                device=device
            )

            generated = generator(noise).cpu()

        images = []

        for tensor in generated:
            # Convert [-1, 1] into [0, 1].
            tensor = ((tensor + 1.0) / 2.0).clamp(0, 1)

            image = (
                tensor.permute(1, 2, 0).numpy() * 255
            ).round().astype("uint8")

            buffer = BytesIO()

            Image.fromarray(image).save(
                buffer, format="PNG"
            )

            encoded = base64.b64encode(
                buffer.getvalue()
            ).decode("ascii")

            images.append(encoded)

        return {
            "count": len(images),
            "images": images,
            "image_size": IMAGE_SIZE
        }

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Image generation failed: {exc}"
        ) from exc