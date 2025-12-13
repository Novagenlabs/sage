import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

async function fixSocratesImage() {
  console.log('Loading existing Socrates image...');

  // Read the existing image and convert to base64
  const imagePath = path.join(__dirname, '../public/socrates.png');
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');
  const imageDataUrl = `data:image/png;base64,${base64Image}`;

  console.log('Sending to Gemini to remove text...');

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.0-flash-exp:free',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: imageDataUrl
              }
            },
            {
              type: 'text',
              text: 'Please recreate this exact image of Socrates but remove the text "SOCARATES" at the bottom completely. Keep everything else exactly the same - the portrait style, colors, lighting, and composition. Output only the new image without any text overlays.'
            }
          ]
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

  // Save to public directory (backup old one first)
  const backupPath = path.join(__dirname, '../public/socrates-old.png');
  fs.copyFileSync(imagePath, backupPath);
  console.log(`Backed up old image to: ${backupPath}`);

  const outputPath = path.join(__dirname, '../public/socrates.png');
  fs.writeFileSync(outputPath, buffer);

  console.log(`New image saved to: ${outputPath}`);
  console.log(`Size: ${(buffer.length / 1024).toFixed(2)} KB`);
}

fixSocratesImage().catch(console.error);
