import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

async function generateSocratesImage() {
  console.log('Generating Socrates image...');

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
          content: 'Generate a beautiful, artistic portrait of Socrates, the ancient Greek philosopher. He should look wise and contemplative, with his characteristic beard and philosophical expression. Use a modern, stylized aesthetic with subtle purple and indigo tones that blend into a dark background. The image should feel premium and mysterious, suitable as a website hero image. Include subtle glow effects around him. Style: digital art, contemporary, elegant.'
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
  const outputPath = path.join(__dirname, '../public/socrates.png');
  fs.writeFileSync(outputPath, buffer);

  console.log(`Image saved to: ${outputPath}`);
  console.log(`Size: ${(buffer.length / 1024).toFixed(2)} KB`);
}

generateSocratesImage().catch(console.error);
