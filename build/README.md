# App Icons

This directory should contain the app icons for each platform.

## Required Files

- `icon.icns` - macOS app icon (required for macOS builds)
- `icon.ico` - Windows app icon (required for Windows builds)
- `icon.png` - Linux app icon (256x256 or larger, required for Linux builds)

## Creating Icons from SVG

The `icon.svg` file is the source design. Convert it to the required formats:

### macOS (icon.icns)

```bash
# Create iconset directory with required sizes
mkdir icon.iconset
for size in 16 32 64 128 256 512; do
  sips -z $size $size icon.png --out icon.iconset/icon_${size}x${size}.png
  sips -z $((size*2)) $((size*2)) icon.png --out icon.iconset/icon_${size}x${size}@2x.png
done
# Convert to icns
iconutil -c icns icon.iconset -o icon.icns
rm -rf icon.iconset
```

### Windows (icon.ico)

Use ImageMagick or an online converter:
```bash
convert icon.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico
```

Or use an online tool like https://convertio.co/png-ico/

### Linux (icon.png)

Just use a 512x512 or 256x256 PNG:
```bash
# If you have the source PNG already
cp icon-512.png icon.png
```

## Quick Start with Placeholder

If you need to test builds quickly, you can generate a simple placeholder PNG:

```bash
# Using Node.js with canvas (npm install canvas)
node -e "
const { createCanvas } = require('canvas');
const fs = require('fs');
const canvas = createCanvas(512, 512);
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#0f0f0f';
ctx.fillRect(0, 0, 512, 512);
ctx.fillStyle = '#ff0000';
ctx.beginPath();
ctx.arc(256, 220, 120, 0, Math.PI * 2);
ctx.fill();
ctx.fillStyle = 'white';
ctx.beginPath();
ctx.moveTo(220, 170);
ctx.lineTo(220, 270);
ctx.lineTo(300, 220);
ctx.fill();
fs.writeFileSync('icon.png', canvas.toBuffer('image/png'));
"
```
