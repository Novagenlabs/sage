/**
 * Download required model files for the voice agent
 * - Silero VAD model
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const modelsDir = join(__dirname, '..', 'models');

// Create models directory if it doesn't exist
if (!existsSync(modelsDir)) {
  mkdirSync(modelsDir, { recursive: true });
}

console.log('Downloading Silero VAD model...');

const vadUrl = 'https://github.com/snakers4/silero-vad/raw/master/files/silero_vad.onnx';
const vadPath = join(modelsDir, 'silero_vad.onnx');

if (!existsSync(vadPath)) {
  try {
    execSync(`curl -L -o "${vadPath}" "${vadUrl}"`, { stdio: 'inherit' });
    console.log('Silero VAD model downloaded successfully');
  } catch (error) {
    console.error('Failed to download Silero VAD model:', error.message);
    process.exit(1);
  }
} else {
  console.log('Silero VAD model already exists');
}

console.log('All model files ready!');
