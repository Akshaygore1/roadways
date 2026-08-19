import * as THREE from 'three';

export class TextureGenerator {
  /**
   * Generates procedural 2-lane Indian highway asphalt texture.
   * Features:
   * - Dark asphalt with micro-grain noise
   * - Dashed white lane divider in center
   * - Solid white/yellow road edge boundary lines
   */
  public static createRoadTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // 1. Asphalt base
    ctx.fillStyle = '#22252a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Grain noise
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 20;
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
    }
    ctx.putImageData(imgData, 0, 0);

    // 3. Road edge solid white lines (left and right)
    ctx.strokeStyle = '#e6e8eb';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(32, 0);
    ctx.lineTo(32, canvas.height);
    ctx.moveTo(canvas.width - 32, 0);
    ctx.lineTo(canvas.width - 32, canvas.height);
    ctx.stroke();

    // 4. Center dashed white line (Indian standard 3m stripe, 3m gap)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 12;
    ctx.setLineDash([80, 80]);
    ctx.lineDashOffset = 0;
    ctx.beginPath();
    const midX = canvas.width / 2;
    ctx.moveTo(midX, 0);
    ctx.lineTo(midX, canvas.height);
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 8;
    return texture;
  }

  /**
   * Generates Indian roadside gravel/kaccha red-brown dirt shoulder texture
   */
  public static createShoulderTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Warm reddish-brown earth base
    ctx.fillStyle = '#6b4c35';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 45;
      data[i] = Math.min(255, Math.max(0, data[i] + noise + 10));     // R
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));  // G
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise * 0.7)); // B
    }
    ctx.putImageData(imgData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  /**
   * Generates Indian highway milestone texture (National Highway yellow top, white base, NH 44 text)
   */
  public static createMilestoneTexture(km: number, nh: string = 'NH 44'): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // White base
    ctx.fillStyle = '#f2f2f2';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Yellow NH dome top (Indian National Highway standard is Yellow dome)
    ctx.fillStyle = '#f5b000';
    ctx.fillRect(0, 0, canvas.width, 180);

    // Dark text
    ctx.fillStyle = '#111111';
    ctx.textAlign = 'center';

    // NH text
    ctx.font = 'bold 44px sans-serif';
    ctx.fillText(nh, canvas.width / 2, 110);

    // KM text
    ctx.font = 'bold 64px sans-serif';
    ctx.fillText(`${km}`, canvas.width / 2, 320);

    ctx.font = 'bold 32px sans-serif';
    ctx.fillText('KM', canvas.width / 2, 380);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  /**
   * Generates authentic Indian truck cargo side (Dala) wooden art texture.
   */
  public static createTruckDalaSideTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // 1. Vibrant orange-yellow wooden base
    ctx.fillStyle = '#e67300';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Horizontal wooden slats shading
    const plankCount = 6;
    const plankHeight = canvas.height / plankCount;
    for (let i = 0; i < plankCount; i++) {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 190, 40, 0.25)' : 'rgba(180, 70, 0, 0.2)';
      ctx.fillRect(0, i * plankHeight, canvas.width, plankHeight);
      ctx.strokeStyle = 'rgba(70, 30, 0, 0.4)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, (i + 1) * plankHeight);
      ctx.lineTo(canvas.width, (i + 1) * plankHeight);
      ctx.stroke();
    }

    // 3. Top Decorative Border (Indian Flag / Tri-color chevron bands)
    const bandHeight = 28;
    ctx.fillStyle = '#ff9933';
    ctx.fillRect(0, 0, canvas.width, bandHeight);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, bandHeight, canvas.width, bandHeight);
    ctx.fillStyle = '#138808';
    ctx.fillRect(0, bandHeight * 2, canvas.width, bandHeight);

    // 4. Central decorative panels
    // Main banner background
    ctx.fillStyle = '#0055aa';
    ctx.fillRect(80, 120, canvas.width - 160, 150);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 8;
    ctx.strokeRect(80, 120, canvas.width - 160, 150);

    // Inner yellow frame
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.strokeRect(90, 130, canvas.width - 180, 130);

    // Text: ALL INDIA PERMIT & GOODS CARRIER
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 52px "Outfit", sans-serif';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 8;
    ctx.fillText('GOODS CARRIER', canvas.width / 2, 190);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 36px "Outfit", sans-serif';
    ctx.fillText('★ ALL INDIA PERMIT ★', canvas.width / 2, 240);

    // 5. Traditional Decorative Floral Medallions on Left & Right
    const drawMedallion = (cx: number, cy: number, radius: number) => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#d62828';
      ctx.fill();
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 6;
      ctx.stroke();

      // Flower petals
      const petals = 8;
      for (let p = 0; p < petals; p++) {
        const angle = (p * Math.PI * 2) / petals;
        const px = cx + Math.cos(angle) * (radius * 0.65);
        const py = cy + Math.sin(angle) * (radius * 0.65);
        ctx.beginPath();
        ctx.arc(px, py, radius * 0.28, 0, Math.PI * 2);
        ctx.fillStyle = '#fcbf49';
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.restore();
    };

    drawMedallion(170, 380, 75);
    drawMedallion(canvas.width - 170, 380, 75);

    // Center slogan banner
    ctx.fillStyle = '#9b111e';
    ctx.fillRect(280, 330, canvas.width - 560, 100);
    ctx.strokeStyle = '#f4a261';
    ctx.lineWidth = 6;
    ctx.strokeRect(280, 330, canvas.width - 560, 100);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 34px "Outfit", sans-serif';
    ctx.fillText('MERA BHARAT MAHAN', canvas.width / 2, 392);

    // 6. Bottom chevron teeth border
    const toothWidth = 40;
    const toothHeight = 40;
    for (let x = 0; x < canvas.width; x += toothWidth) {
      ctx.fillStyle = (x / toothWidth) % 2 === 0 ? '#d90429' : '#ffdd00';
      ctx.beginPath();
      ctx.moveTo(x, canvas.height);
      ctx.lineTo(x + toothWidth / 2, canvas.height - toothHeight);
      ctx.lineTo(x + toothWidth, canvas.height);
      ctx.closePath();
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 8;
    return texture;
  }

  /**
   * Generates iconic Indian truck tailgate texture with 'HORN OK PLEASE'.
   */
  public static createTruckTailgateTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 768;
    const ctx = canvas.getContext('2d')!;

    // 1. Rich Red / Crimson Base
    ctx.fillStyle = '#a61c1c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Yellow Inner Panel Frame
    ctx.fillStyle = '#e69500';
    ctx.fillRect(30, 30, canvas.width - 60, canvas.height - 60);

    ctx.fillStyle = '#112233';
    ctx.fillRect(50, 50, canvas.width - 100, canvas.height - 100);

    // 3. Top Banner: "DEKHO MAGAR PYAAR SE" / "USE DIPPER AT NIGHT"
    ctx.fillStyle = '#e63946';
    ctx.fillRect(70, 70, canvas.width - 140, 80);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 4;
    ctx.strokeRect(70, 70, canvas.width - 140, 80);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px "Outfit", sans-serif';
    ctx.fillText('★ USE DIPPER AT NIGHT ★', canvas.width / 2, 125);

    // 4. Centerpiece: The Legendary "HORN OK PLEASE"
    // Left Box: "HORN"
    ctx.fillStyle = '#ffbe0b';
    ctx.fillRect(90, 200, 260, 220);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.strokeRect(90, 200, 260, 220);

    ctx.fillStyle = '#1a1a1a';
    ctx.font = '900 68px "Outfit", sans-serif';
    ctx.fillText('HORN', 220, 335);

    // Middle Box: "OK" (Classic Octagon / Oval)
    ctx.fillStyle = '#d90429';
    ctx.beginPath();
    ctx.arc(canvas.width / 2, 310, 110, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 8;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 96px "Outfit", sans-serif';
    ctx.fillText('OK', canvas.width / 2, 345);

    // Right Box: "PLEASE"
    ctx.fillStyle = '#ffbe0b';
    ctx.fillRect(canvas.width - 350, 200, 260, 220);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.strokeRect(canvas.width - 350, 200, 260, 220);

    ctx.fillStyle = '#1a1a1a';
    ctx.font = '900 58px "Outfit", sans-serif';
    ctx.fillText('PLEASE', canvas.width - 220, 335);

    // 5. Lower Slogan: "BURI NAZAR WALE TERA MOOH KALA"
    ctx.fillStyle = '#065a60';
    ctx.fillRect(80, 470, canvas.width - 160, 90);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 5;
    ctx.strokeRect(80, 470, canvas.width - 160, 90);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px "Outfit", sans-serif';
    ctx.fillText('बुरी नज़र वाले तेरा मुँह काला', canvas.width / 2, 530);

    // 6. Bottom Safety Warning: "KEEP DISTANCE"
    ctx.fillStyle = '#ffb703';
    ctx.font = 'bold 32px "JetBrains Mono", monospace';
    ctx.fillText('◀ KEEP DISTANCE ▶   SPEED: 40 KM/H', canvas.width / 2, 610);

    // 7. Bottom Red & White diagonal hazard stripes
    const stripeWidth = 50;
    const stripeHeight = 60;
    const stripeY = canvas.height - 110;
    for (let x = 60; x < canvas.width - 60; x += stripeWidth) {
      ctx.fillStyle = (x / stripeWidth) % 2 === 0 ? '#d90429' : '#ffffff';
      ctx.fillRect(x, stripeY, stripeWidth, stripeHeight);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 8;
    return texture;
  }

  /**
   * Generates ornamental roof crown (Taj) texture for Indian truck cabin.
   */
  public static createTruckTajTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Golden / Brass sunburst background
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#f9c74f');
    grad.addColorStop(0.5, '#f8961e');
    grad.addColorStop(1, '#9d0208');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Ornate peacock / sunburst rays
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 4;
    for (let a = 0; a < Math.PI; a += Math.PI / 16) {
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, canvas.height);
      ctx.lineTo(
        canvas.width / 2 + Math.cos(a) * 300,
        canvas.height - Math.sin(a) * 200
      );
      ctx.stroke();
    }

    // Central Auspicious Medallion
    ctx.beginPath();
    ctx.arc(canvas.width / 2, 130, 80, 0, Math.PI * 2);
    ctx.fillStyle = '#ae2012';
    ctx.fill();
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 54px sans-serif';
    ctx.fillText('ॐ', canvas.width / 2, 150);

    // Top border diamonds
    const diaSize = 32;
    for (let x = 0; x < canvas.width; x += diaSize) {
      ctx.fillStyle = (x / diaSize) % 2 === 0 ? '#0077b6' : '#ffd166';
      ctx.beginPath();
      ctx.moveTo(x + diaSize / 2, 5);
      ctx.lineTo(x + diaSize, 25);
      ctx.lineTo(x + diaSize / 2, 45);
      ctx.lineTo(x, 25);
      ctx.closePath();
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 8;
    return texture;
  }

  /**
   * Generates diagonal hazard warning stripes for bumpers.
   */
  public static createHazardStripeTexture(color1: string = '#ffd000', color2: string = '#111111'): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = color1;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = color2;
    const stripeW = 40;
    for (let x = -canvas.height; x < canvas.width + canvas.height; x += stripeW * 2) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + stripeW, 0);
      ctx.lineTo(x + stripeW + canvas.height, canvas.height);
      ctx.lineTo(x + canvas.height, canvas.height);
      ctx.closePath();
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  /**
   * Generates authentic black rubber mudflap texture with white lettering.
   */
  public static createMudflapTexture(text: string = 'STOP'): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Black textured rubber
    ctx.fillStyle = '#1c1e21';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // White border
    ctx.strokeStyle = '#e6e8eb';
    ctx.lineWidth = 10;
    ctx.strokeRect(15, 15, canvas.width - 30, canvas.height - 30);

    // White bold text
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e6e8eb';
    ctx.font = '900 64px "Outfit", sans-serif';
    ctx.fillText(text, canvas.width / 2, 145);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }
}

