const { createCanvas, loadImage, registerFont } = require('canvas');
const fs = require('fs');

async function generateFeatureGraphic() {
  const width = 1024;
  const height = 500;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Fundo gradiente azul/roxo
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, '#1d4ed8');
  grad.addColorStop(0.5, '#4f46e5');
  grad.addColorStop(1, '#7c3aed');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Círculos decorativos
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(880, -60, 200, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(100, 520, 180, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(600, 400, 120, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;

  // Ícone do calendário (emoji via texto)
  ctx.font = 'bold 90px Arial';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText('📅', 512, 170);

  // Nome AgendAI
  ctx.font = 'bold 88px Arial';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText('AgendAI', 512, 270);

  // Tagline
  ctx.font = '36px Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText('Sua agenda inteligente', 512, 330);

  // Pills com features
  const features = ['📆 Compromissos', '🔔 Urgente', '👥 Compartilhar'];
  const pillW = 230, pillH = 44, pillY = 390;
  const startX = (width - features.length * pillW - (features.length - 1) * 16) / 2;

  features.forEach((f, i) => {
    const x = startX + i * (pillW + 16);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.roundRect(x, pillY, pillW, pillH, 22);
    ctx.fill();

    ctx.font = '20px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText(f, x + 16, pillY + 28);
  });

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync('D:/TRABALHO/Sistema_Agendai/agendai/play-store-assets/feature-graphic-1024x500.png', buffer);
  console.log('feature-graphic-1024x500.png criado!');
}

generateFeatureGraphic().catch(console.error);
