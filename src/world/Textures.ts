import * as THREE from 'three';

export class TextureGenerator {
  /**
   * Generates high-fidelity 2-lane Indian highway asphalt texture (1024x2048).
   * Features:
   * - Multi-scale asphalt bitumen aggregate grain with micro-roughness
   * - Darker tire contact wear tracks where heavy trucks and vehicles drive
   * - Weathered thermoplastic white dashed center divider (3m stripe, 3m gap)
   * - Solid white edge boundary lines with subtle edge feathering
   * - Realistic asphalt tar repairs / bitumen crack patches
   */
  public static createRoadTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 2048;
    const ctx = canvas.getContext('2d')!;

    // 1. Base dark asphalt color
    ctx.fillStyle = '#1e2126';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Multi-scale procedural aggregate noise
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      // Coarse grain + fine aggregate
      const grain = (Math.random() - 0.5) * 28 + (Math.random() - 0.5) * 14;
      data[i] = Math.min(255, Math.max(0, data[i] + grain));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + grain));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + grain + 2)); // slight cool blue-gray tone
    }
    ctx.putImageData(imgData, 0, 0);

    // 3. Dark tire contact wear tracks in left and right lanes
    // In a 2-lane road:
    // Left lane wheel tracks: around x = 200 and x = 380
    // Right lane wheel tracks: around x = 644 and x = 824
    const tireGrad = ctx.createLinearGradient(0, 0, canvas.width, 0);
    tireGrad.addColorStop(0.00, 'rgba(0,0,0,0)');
    tireGrad.addColorStop(0.12, 'rgba(10,12,15,0.45)');  // Left outer wheel track
    tireGrad.addColorStop(0.25, 'rgba(10,12,15,0.15)');  // Left lane center
    tireGrad.addColorStop(0.38, 'rgba(10,12,15,0.45)');  // Left inner wheel track
    tireGrad.addColorStop(0.50, 'rgba(0,0,0,0.05)');     // Center line region
    tireGrad.addColorStop(0.62, 'rgba(10,12,15,0.45)');  // Right inner wheel track
    tireGrad.addColorStop(0.75, 'rgba(10,12,15,0.15)');  // Right lane center
    tireGrad.addColorStop(0.88, 'rgba(10,12,15,0.45)');  // Right outer wheel track
    tireGrad.addColorStop(1.00, 'rgba(0,0,0,0)');

    ctx.fillStyle = tireGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 4. Random bitumen tar repairs / crack patch seams
    ctx.strokeStyle = '#141619';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    for (let p = 0; p < 8; p++) {
      const startX = 120 + Math.random() * (canvas.width - 240);
      const startY = Math.random() * canvas.height;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      let cx = startX;
      let cy = startY;
      for (let s = 0; s < 4; s++) {
        cx += (Math.random() - 0.5) * 60;
        cy += Math.random() * 40;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();

      // Occasional rectangular tar patch
      if (p % 3 === 0) {
        ctx.fillStyle = 'rgba(15, 17, 20, 0.7)';
        ctx.fillRect(startX - 20, startY - 10, 45 + Math.random() * 30, 20 + Math.random() * 30);
      }
    }

    // 5. Road edge solid white boundary lines
    ctx.strokeStyle = '#e8ebed';
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.moveTo(48, 0);
    ctx.lineTo(48, canvas.height);
    ctx.moveTo(canvas.width - 48, 0);
    ctx.lineTo(canvas.width - 48, canvas.height);
    ctx.stroke();

    // 6. Center dashed white line (Indian Highway standard 3m paint, 3m gap)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 16;
    ctx.setLineDash([140, 140]);
    ctx.lineDashOffset = 0;
    ctx.beginPath();
    const midX = canvas.width / 2;
    ctx.moveTo(midX, 0);
    ctx.lineTo(midX, canvas.height);
    ctx.stroke();

    // Subtle edge weathering on paint lines
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(30, 33, 38, 0.25)';
    ctx.lineWidth = 2;
    for (let y = 0; y < canvas.height; y += 30) {
      if (Math.random() > 0.4) {
        ctx.strokeRect(midX - 10, y, 20, 4 + Math.random() * 8);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 16;
    return texture;
  }

  /**
   * Generates a tangent-space normal map for asphalt micro-grain, cracks, and road marking edges.
   */
  public static createRoadNormalMap(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // Neutral normal base: RGB(128, 128, 255) -> (0, 0, 1) in tangent space
    ctx.fillStyle = '#8080ff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    // Generate asphalt micro-bump normal perturbation
    for (let i = 0; i < data.length; i += 4) {
      const nx = (Math.random() - 0.5) * 32;
      const ny = (Math.random() - 0.5) * 32;
      data[i] = Math.min(255, Math.max(0, 128 + nx));     // Normal X
      data[i + 1] = Math.min(255, Math.max(0, 128 + ny)); // Normal Y
      data[i + 2] = 255;                                  // Normal Z
    }
    ctx.putImageData(imgData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 8;
    return texture;
  }

  /**
   * Generates authentic Indian roadside kaccha red-brown moorum dirt and gravel shoulder texture (512x512).
   */
  public static createShoulderTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Warm reddish-brown earth base (Moorum soil)
    ctx.fillStyle = '#7a4f36';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Multi-color pebble & dirt noise
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 55;
      const pebble = Math.random() > 0.96 ? (Math.random() * 40) : 0;
      data[i] = Math.min(255, Math.max(0, data[i] + noise + 15 + pebble));       // R (Warm red)
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise * 0.9 + pebble * 0.9)); // G
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise * 0.6 + pebble * 0.8)); // B
    }
    ctx.putImageData(imgData, 0, 0);

    // Subtle scattered gravel pebbles and dry grass patches
    for (let p = 0; p < 80; p++) {
      const px = Math.random() * canvas.width;
      const py = Math.random() * canvas.height;
      const pr = 1 + Math.random() * 3.5;
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(175, 140, 110, 0.7)' : 'rgba(70, 45, 30, 0.6)';
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 8;
    return texture;
  }

  /**
   * Generates tangent-space normal map for the gravel shoulder.
   */
  public static createShoulderNormalMap(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#8080ff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const nx = (Math.random() - 0.5) * 45;
      const ny = (Math.random() - 0.5) * 45;
      data[i] = Math.min(255, Math.max(0, 128 + nx));
      data[i + 1] = Math.min(255, Math.max(0, 128 + ny));
      data[i + 2] = 255;
    }
    ctx.putImageData(imgData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  /**
   * Generates galvanized steel W-beam guardrail texture with reflective warning tabs.
   */
  public static createGuardrailTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    // Galvanized zinc-steel base gradient (simulates W-beam corrugated profile)
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0.00, '#a8b0b8');
    grad.addColorStop(0.20, '#d0d8e0');
    grad.addColorStop(0.50, '#889098');
    grad.addColorStop(0.80, '#d0d8e0');
    grad.addColorStop(1.00, '#788088');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Weathered metallic grain
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 20;
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
    }
    ctx.putImageData(imgData, 0, 0);

    // Retro-reflective amber & red rectangular markers along the beam
    const reflectorSpacing = 128;
    for (let x = 32; x < canvas.width; x += reflectorSpacing) {
      ctx.fillStyle = '#ff3b30'; // Red reflector
      ctx.fillRect(x, 44, 20, 40);
      ctx.fillStyle = '#ffcc00'; // Amber reflector
      ctx.fillRect(x + 22, 44, 20, 40);
      ctx.strokeStyle = '#222222';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, 44, 42, 40);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  /**
   * Generates authentic Indian highway caution / signboards.
   */
  public static createRoadSignTexture(
    type: 'curve_left' | 'curve_right' | 'ghat' | 'speed_60' | 'go_slow'
  ): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Yellow highway caution diamond base
    ctx.fillStyle = '#ffbe0b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Black outer border
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 14;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    ctx.fillStyle = '#111111';
    ctx.textAlign = 'center';

    if (type === 'curve_left' || type === 'curve_right') {
      ctx.beginPath();
      ctx.lineWidth = 18;
      ctx.lineCap = 'round';
      if (type === 'curve_right') {
        ctx.moveTo(90, 180);
        ctx.lineTo(90, 110);
        ctx.arcTo(90, 70, 160, 70, 40);
        ctx.lineTo(170, 70);
        ctx.stroke();
        // Arrow head
        ctx.beginPath();
        ctx.moveTo(170, 45);
        ctx.lineTo(200, 70);
        ctx.lineTo(170, 95);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.moveTo(166, 180);
        ctx.lineTo(166, 110);
        ctx.arcTo(166, 70, 96, 70, 40);
        ctx.lineTo(86, 70);
        ctx.stroke();
        // Arrow head
        ctx.beginPath();
        ctx.moveTo(86, 45);
        ctx.lineTo(56, 70);
        ctx.lineTo(86, 95);
        ctx.closePath();
        ctx.fill();
      }
    } else if (type === 'speed_60') {
      // White circle with red ring (Speed Limit)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(128, 128, 105, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#d90429';
      ctx.lineWidth = 20;
      ctx.stroke();

      ctx.fillStyle = '#111111';
      ctx.font = '900 84px "Outfit", sans-serif';
      ctx.fillText('60', 128, 158);
    } else if (type === 'ghat') {
      ctx.font = 'bold 36px "Outfit", sans-serif';
      ctx.fillText('GHAT ROAD', 128, 110);
      ctx.font = 'bold 28px "Outfit", sans-serif';
      ctx.fillText('GO SLOW', 128, 160);
    } else {
      ctx.font = '900 48px "Outfit", sans-serif';
      ctx.fillText('GO', 128, 115);
      ctx.fillText('SLOW', 128, 175);
    }

    const texture = new THREE.CanvasTexture(canvas);
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
   * Generates hand-painted roadside business boards for dhabas and chai stalls.
   */
  public static createRoadsideBusinessSignTexture(type: 'dhaba' | 'chai'): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    const isDhaba = type === 'dhaba';
    ctx.fillStyle = isDhaba ? '#f4b942' : '#d94b32';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = isDhaba ? '#1f5b3a' : '#f5d76e';
    ctx.lineWidth = 22;
    ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);

    ctx.fillStyle = isDhaba ? '#183a2a' : '#fff4cf';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 92px "Arial Black", "Noto Sans Devanagari", sans-serif';
    ctx.fillText(isDhaba ? 'HIGHWAY DHABA' : 'CHAI  •  चाय', canvas.width * 0.5, 103);

    ctx.fillStyle = isDhaba ? '#7b261b' : '#fff0b3';
    ctx.font = '700 40px "Noto Sans Devanagari", Arial, sans-serif';
    ctx.fillText(
      isDhaba ? 'हाईवे ढाबा' : 'CUTTING CHAI  •  ₹10',
      canvas.width * 0.5,
      195
    );

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
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
