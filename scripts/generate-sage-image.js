import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

async function generateSageImage() {
  console.log('Generating Sage avatar image...');

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash-image-preview',
      messages: [
        {
          role: 'user',
          content: `Generate a beautiful, artistic portrait of a wise sage or oracle figure. This should be a timeless, gender-neutral wise figure - not specifically Socrates or any historical person. The figure should appear:

- Wise and calm, with knowing eyes
- Mysterious but approachable
- Ageless, timeless quality
- Warm amber/golden lighting with subtle glow
- Dark background that fades to black
- Modern, stylized digital art aesthetic
- Premium, elegant feel
- Face should be the focus, suitable for a circular avatar

Style: contemporary digital art, mystical but not fantasy, warm tones (amber, gold, bronze), elegant and minimal. NO text or words in the image.`
        }
      ],
      modalities: ['image', 'text']
    })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('API Error:', error);
    throw new Error(`API request failed: ${response.status}`);
  }

  const data = await response.json();
  console.log('Response received');

  // Extract the base64 image
  const images = data.choices?.[0]?.message?.images;

  if (!images || images.length === 0) {
    console.log('Full response:', JSON.stringify(data, null, 2));
    throw new Error('No images in response');
  }

  const imageUrl = images[0].image_url?.url;
  if (!imageUrl) {
    throw new Error('No image URL found');
  }

  // Extract base64 data
  const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');

  // Save to public directory
  const outputPath = path.join(__dirname, '../public/sage.png');
  fs.writeFileSync(outputPath, buffer);

  console.log(`Image saved to: ${outputPath}`);
  console.log(`Size: ${(buffer.length / 1024).toFixed(2)} KB`);
}

generateSageImage().catch(console.error);
