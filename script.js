const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const captureBtn = document.getElementById('captureBtn');
const output = document.getElementById('output');
const ctx = canvas.getContext('2d');

// Acceder a la cámara
navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => {
    video.srcObject = stream;
  })
  .catch(err => {
    console.error('Error al acceder a la cámara:', err);
  });

captureBtn.addEventListener('click', async () => {
  // Dibujar el frame actual en el canvas
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Opcional: aplicar preprocesamiento (básico)
  let frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let gray = new Uint8ClampedArray(frame.data.length);

  for (let i = 0; i < frame.data.length; i += 4) {
    let avg = (frame.data[i] + frame.data[i + 1] + frame.data[i + 2]) / 3;
    // Threshold simple
    let value = avg > 128 ? 255 : 0;
    gray[i] = gray[i + 1] = gray[i + 2] = value;
    gray[i + 3] = 255;
  }

  // Reescribir el canvas con la imagen binarizada
  const binarized = new ImageData(new Uint8ClampedArray(gray), canvas.width, canvas.height);
  ctx.putImageData(binarized, 0, 0);

  output.textContent = "Procesando...";

  // Ejecutar OCR con Tesseract.js
  const { data: { text } } = await Tesseract.recognize(
    canvas, // el canvas con la imagen binarizada
    'eng',
    {
      logger: m => console.log(m),
      tessedit_char_whitelist: '0123456789.' // solo números y punto decimal
    }
  );

  output.textContent = `Texto detectado: ${text.trim()}`;
});