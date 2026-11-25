"""Vértice Docs v0.6.57 — gera as texturas dos post-its (sem fotos de terceiros; tudo desenhado por conta, semente fixa).
Mancha de café: anel fino e escuro na borda (o café seca e junta a cor na beira), miolo claro e translúcido,
borda irregular, um trecho do anel mais fraco, um segundo anel parcial (a xícara posta duas vezes) e respingos.
Amassado: facetas de papel amassado com luz vinda de cima à esquerda e vincos nas dobras.
Uso: python3 scripts/gerar-texturas.py  (grava em src/quadro/texturas/)"""
import numpy as np
from PIL import Image, ImageFilter
import os
SAIDA = os.path.join(os.path.dirname(__file__), '..', 'src', 'quadro', 'texturas')
rng = np.random.default_rng(57)

def ruido1d(theta, termos):
    return sum(a * np.sin(k * theta + f) for a, k, f in termos)

def anel(alfa, cx, cy, R, forca, miolo, arco=None, larg=2.6, seed=0):
    r_ = np.random.default_rng(seed)
    H, W = alfa.shape
    y, x = np.mgrid[0:H, 0:W].astype(float)
    dx, dy = x - cx, y - cy
    th = np.arctan2(dy, dx); d = np.hypot(dx, dy)
    termos = [(r_.uniform(.004, .009) * (2 if k == 2 else 1), k, r_.uniform(0, 6.3)) for k in (2, 3, 4, 5, 7)]  # quase redondo, como a boca da xícara
    raio = R * (1 + ruido1d(th, termos))
    # força ao longo do anel: um trecho mais fraco, como nas fotos
    w = 0.62 + 0.38 * np.cos(th - r_.uniform(0, 6.3)) ** 2 + 0.12 * np.sin(4 * th + r_.uniform(0, 6.3))
    w = np.clip(w, 0.18, 1)
    if arco:
        a0, a1 = arco
        dentro = ((th - a0) % (2 * np.pi)) < ((a1 - a0) % (2 * np.pi))
        sombra = np.clip(np.minimum((th - a0) % (2 * np.pi), (a1 - th) % (2 * np.pi)) / 0.5, 0, 1)
        w = w * np.where(dentro, sombra, 0)
    t = d - raio  # negativo = dentro
    borda = np.where(t > 0, np.exp(-(t / 0.9) ** 2), np.exp(-(t / larg) ** 2))  # beira de fora seca e nítida
    a = forca * w * borda
    if miolo:
        fundo = np.where(t < 0, miolo * (0.35 + 0.65 * np.exp(np.minimum(t, 0) / (R * 0.12))), 0)  # mais cor perto da beira
        a = a + fundo
    return np.maximum(alfa, a) if arco else alfa + a

def mancha():
    S = 300
    alfa = np.zeros((S, S))
    alfa = anel(alfa, 150, 150, 104, 0.66, 0.06, seed=1)
    alfa = anel(alfa, 190, 112, 102, 0.30, 0, arco=(3.6, 5.9), larg=1.6, seed=2)
    # respingos: gotinhas com a mesma beira escura
    for (gx, gy, gr) in [(40, 248, 7), (58, 262, 3.5), (262, 44, 5), (274, 62, 2.6), (30, 70, 2.2)]:
        alfa = anel(alfa, gx, gy, gr, 0.55, 0.18, larg=1.2, seed=int(gx))
    # grão do papel
    grao = Image.fromarray((rng.random((S, S)) * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(1.2))
    alfa = alfa * (0.82 + 0.36 * (np.asarray(grao) / 255.0))
    alfa = np.clip(alfa, 0, 0.78)
    # cor: beira mais escura (café seco), miolo mais claro
    forte = np.clip(alfa / 0.6, 0, 1)[..., None]
    cor = (1 - forte) * np.array([166, 112, 58]) + forte * np.array([104, 58, 22])
    img = np.dstack([cor, alfa[..., None] * 255]).astype('uint8')
    Image.fromarray(img, 'RGBA').save(os.path.join(SAIDA, 'cafe.png'), optimize=True)

def amassado():
    """Papel amassado e alisado: dobras retas que cruzam a folha (cada uma é um vinco em V), luz de cima à esquerda."""
    W, H = 340, 260
    y, x = np.mgrid[0:H, 0:W].astype(float)
    h = np.zeros((H, W))
    for _ in range(22):
        ang = rng.uniform(0, np.pi); cx, cy = rng.uniform(0, W), rng.uniform(0, H)
        dist = (x - cx) * np.sin(ang) - (y - cy) * np.cos(ang)
        alcance = rng.uniform(25, 120); forca = rng.uniform(0.15, 0.45) * rng.choice([-1, 1])
        h += forca * np.minimum(np.abs(dist), alcance)
    gy, gx = np.gradient(h)
    s = -(gx * -0.6 + gy * -0.8)
    s = (s - np.median(s)) / (np.percentile(np.abs(s - np.median(s)), 97) + 1e-6)
    s = np.asarray(Image.fromarray(((np.clip(s, -1.5, 1.5) + 1.5) / 3 * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(0.9))) / 255 * 3 - 1.5
    grao = np.asarray(Image.fromarray((rng.random((H, W)) * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(0.7))) / 255 - 0.5
    s = s + 0.25 * grao
    claro = np.clip(s, 0, None); escuro = np.clip(-s, 0, None)
    a = np.where(s >= 0, claro * 0.26, escuro * 0.16)
    cor = np.where((s >= 0)[..., None], np.array([255, 255, 255]), np.array([40, 34, 20]))
    img = np.dstack([cor, np.clip(a, 0, 0.38)[..., None] * 255]).astype('uint8')
    Image.fromarray(img, 'RGBA').save(os.path.join(SAIDA, 'amassado.png'), optimize=True)

mancha(); amassado()
for f in ('cafe.png', 'amassado.png'): print(f, os.path.getsize(os.path.join(SAIDA, f)) // 1024, 'KB')
