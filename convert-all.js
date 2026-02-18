const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputFolder = path.join(__dirname, 'img');

if (!fs.existsSync(inputFolder)) {
  console.log("Folder tidak ditemukan:", inputFolder);
  process.exit();
}

fs.readdirSync(inputFolder).forEach(async file => {
  if (file.endsWith('.jpg') || file.endsWith('.jpeg')) {

    const inputPath = path.join(inputFolder, file);
    const outputPath = path.join(
      inputFolder,
      path.parse(file).name + '.webp'
    );

    try {
      await sharp(inputPath)
        .resize(500)
        .webp({ quality: 75 })
        .toFile(outputPath);

      console.log('Converted:', file);

      // Hapus file JPG lama
      fs.unlinkSync(inputPath);
      console.log('Deleted JPG:', file);

    } catch(err) {
      console.error('Error:', file, err);
    }
  }
});
