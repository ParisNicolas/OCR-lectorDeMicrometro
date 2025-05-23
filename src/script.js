// Elementos del DOM
const listaLecturas = document.getElementById('listaLecturas');

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const overlayText = document.getElementById('overlayText');
const ctx = canvas.getContext('2d');
const widthSlider = document.getElementById('widthSlider');
const heightSlider = document.getElementById('heightSlider');
const cropArea = document.getElementById('crop-area');

// Variables de almacenamiento
let resultados = [{'G': 0.0, 'B': 0.0}];
let lecturas = [{'G': [], 'B': []}];
let timerInterval = null;
let lastValue = null;

// Variables de configuración
let cantidadLecturas = 6;
let chapa = 1, tipo = 'G';
let pausedForConfirmation = false;
let limites = {
  'G': {min: 2.0, max: 12.0},
  'B': {min: 8.0, max: 28.0}
};
let confirmacionCheck = false;
let timerValue = 1.6;

// Sonidos
const sonidoCambioBase = new Audio('base.mp3');
const sonidoCambioChapa = new Audio('chapa.mp3');

// Drag and drop para la zona de recorte
let isDragging = false;
let startX, startY, initialX, initialY;


////// MANEJO DEL CACHE //////
const storageKey = 'chapas_data';

function guardarEnCache() {
  localStorage.setItem(storageKey, JSON.stringify({
    resultados,
    lecturas,
    chapa,
    tipo,
    cantidadLecturas,
    confirmacionCheck,
    limites,
    timerValue
  }));
}

function cargarDeCache() {
  const data = localStorage.getItem(storageKey);
  
  if (data) {
    const parsed = JSON.parse(data);
    resultados = parsed.resultados;
    lecturas = parsed.lecturas;
    chapa = parsed.chapa;
    tipo = parsed.tipo;
    cantidadLecturas = parsed.cantidadLecturas;
    confirmacionCheck = parsed.confirmacionCheck;
    limites = parsed.limites;
    timerValue = parsed.timerValue;
    
    document.getElementById('chapa').textContent = chapa;
    document.getElementById('cantidadLecturasInput').value = cantidadLecturas;
    document.getElementById('confirmationCheck').checked = confirmacionCheck;

    document.getElementById('timerSlider').value = timerValue;
    document.getElementById('timerValue').textContent = timerValue + 's';
    setTipo(tipo);
  }
}

// Cargar datos al iniciar
cargarDeCache();
document.getElementById("limiteGalvInf").value = limites.G.min;
document.getElementById("limiteGalvSup").value = limites.G.max;
document.getElementById("limiteBaseInf").value = limites.B.min;
document.getElementById("limiteBaseSup").value = limites.B.max;


// Acceder a la cámara
navigator.mediaDevices.getUserMedia({video: {facingMode: "environment"}})
  .then(stream => video.srcObject = stream)
  .catch(err => alert('Error al acceder a la cámara'));



////////  RECONOCIMIENTO DE TEXTO ////////

function capturarYLeer(fromTimer = false) {
  // Ajustar canvas al tamaño real del video (no al contenedor)
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  canvas.width = vw;
  canvas.height = vh;

  // Obtener rectángulos visibles
  const cropRect = cropArea.getBoundingClientRect();
  const videoRect = video.getBoundingClientRect();

  // Calcular relación de aspecto y detectar recortes
  const videoAspect = vw / vh;
  const elementAspect = videoRect.width / videoRect.height;

  let scale, offsetX = 0, offsetY = 0;

  if (videoAspect > elementAspect) {
    // El video se recorta horizontalmente (sobran lados)
    scale = vh / videoRect.height;
    const fittedVideoWidth = videoRect.height * videoAspect;
    offsetX = (fittedVideoWidth - videoRect.width) / 2;
  } else {
    // El video se recorta verticalmente (sobran arriba y abajo)
    scale = vw / videoRect.width;
    const fittedVideoHeight = videoRect.width / videoAspect;
    offsetY = (fittedVideoHeight - videoRect.height) / 2;
  }

  // Coordenadas relativas ajustadas
  const cropX = (cropRect.left - videoRect.left + offsetX) * scale;
  const cropY = (cropRect.top - videoRect.top + offsetY) * scale;
  const cropW = cropRect.width * scale;
  const cropH = cropRect.height * scale;

  // Capturar frame original
  ctx.drawImage(video, 0, 0, vw, vh);

  // Obtener recorte
  const cropped = ctx.getImageData(cropX, cropY, cropW, cropH);

  // Dibujarlo en un nuevo canvas
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = cropW;
  tempCanvas.height = cropH;
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.putImageData(cropped, 0, 0);


  // Preprocessing for better OCR
  const imageData = tempCtx.getImageData(0, 0, cropW, cropH);
  const data = imageData.data;

  // Convert to grayscale and increase contrast
  aplicarBlancoYNegro(data);

  tempCtx.putImageData(imageData, 0, 0);

  // Show preview
  const previewCanvas = document.getElementById('previewCanvas');
  previewCanvas.width = cropW;
  previewCanvas.height = cropH;
  previewCanvas.getContext('2d').drawImage(tempCanvas, 0, 0);

  overlayText.textContent = "Procesando...";

  Tesseract.recognize(
    tempCanvas,
    'eng',
    {
      logger: m => console.log(m),
      tessedit_char_whitelist: '0123456789.'
    }
  ).then(({data: {text}}) => {
    const value = parseFloat(text.replace(/[^\d.]/g, ''));
    if (!isNaN(value)) {
      const currentLimits = limites[tipo];
      if (pausedForConfirmation) {
        overlayText.textContent = "Pausado";
        return;
      }
      if (value < currentLimits.min || value > currentLimits.max) {
        overlayText.textContent = "Fuera de rango";
        return;
      }
      if (fromTimer && value === lastValue) {
        overlayText.textContent = "Duplicado";
        return;
      }
      lecturas[chapa - 1][tipo].push(value);
      checkAndChangeType();
      overlayText.textContent = `${value.toFixed(1)} μ`;
      lastValue = value;
    } else {
      overlayText.textContent = "No detectado";
    }
  });
}

function aplicarBlancoYNegro(data, contraste = 1.5, threshold = 128) {
  const factor = (259 * (contraste + 255)) / (255 * (259 - contraste));
  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    const value = factor * (avg - 128) + 128;
    const final = value > threshold ? 255 : 0;
    data[i] = data[i + 1] = data[i + 2] = final;
  }
}


////////  ACTUALIZACION DE LA UI ////////

function actualizarStats() {
  let promedio = resultados[chapa - 1][tipo];
  let desviacion = calcularDesviacion(lecturas[chapa - 1][tipo], promedio);

  document.getElementById('lecturas').textContent = `${lecturas[chapa - 1][tipo].length}/${cantidadLecturas}`;
  document.getElementById('promedio').textContent = `${promedio ? promedio.toFixed(1) : '-'} μ`;
  document.getElementById('desviacion').textContent = `±${desviacion ? desviacion.toFixed(1) : '-'} μ`;

  listaLecturas.innerHTML = '';
  lecturas[chapa - 1][tipo].forEach((val, idx) => {
    const li = document.createElement('span');
    li.textContent = `${val.toFixed(1)}`;
    li.classList.add('bg-gray-200', 'px-1', 'py-0.5', 'text-s', 'rounded', 'text-gray-800'); // Tailwind clases para estilo
    listaLecturas.appendChild(li);
  });
}

function calcularDesviacion(valores, media) {
  if (valores.length === 0) return 0;
  const suma = valores.reduce((acc, x) => acc + (x - media) ** 2, 0);
  return Math.sqrt(suma / valores.length);
}



////////  CAMBIO DE CHAPA Y TIPO ////////
// Mostrar confirmación de cambio de fase
function showPhaseOverlay(title, message, color) {
  const overlay = document.getElementById('phaseOverlay');
  document.getElementById('overlayTitle').textContent = title;
  document.getElementById('overlayMessage').textContent = message;
  document.getElementsByClassName('phaseOverlay-content')[0].style.backgroundColor = color;

  const wasTimerActive = timerInterval !== null;
  if (wasTimerActive) {
    clearInterval(timerInterval);
    timerInterval = null;

    const stopBtn = document.createElement('button');
    stopBtn.className = 'stop-timer-btn';
    stopBtn.textContent = '⏹️ Cerrar sin reanudar capturas';
    stopBtn.onclick = (e) => {
      e.stopPropagation();
      hidePhaseOverlay(false);
      const timerButton = document.getElementById('timerButton');
      timerButton.style.backgroundColor = '#e5e7eb';
    };
    overlay.appendChild(stopBtn);
  }

  overlay.classList.add('active');
  pausedForConfirmation = true;

  // Almacenar el estado del timer para restaurarlo después
  overlay.dataset.wasTimerActive = wasTimerActive;
}

// Ocultar confirmación de cambio de fase
function hidePhaseOverlay(restartTimer = true) {
  const overlay = document.getElementById('phaseOverlay');
  const wasTimerActive = overlay.dataset.wasTimerActive === 'true';

  const stopBtn = overlay.querySelector('.stop-timer-btn');
  if (stopBtn) {
    overlay.removeChild(stopBtn);
  }

  overlay.classList.remove('active');
  pausedForConfirmation = false;

  // Solo reiniciar el timer si estaba activo y se solicita reinicio
  if (wasTimerActive && restartTimer && !timerInterval) {
    setTimeout(() => toggleTimer(), 100);
  }

  delete overlay.dataset.wasTimerActive;
}


function phaseClickHandlerType() {
  hidePhaseOverlay();
  setTipo('B');
  document.removeEventListener('click', phaseClickHandlerType);
}

function phaseClickHandlerChapa() {
  hidePhaseOverlay();
  cambiarChapa(1);
  document.removeEventListener('click', phaseClickHandler);
}

function checkAndChangeType() {
  resultados[chapa - 1][tipo] = lecturas[chapa - 1][tipo].reduce((a, b) => a + b, 0) / lecturas[chapa - 1][tipo].length;

  if (lecturas[chapa - 1][tipo].length === cantidadLecturas) {
    if (tipo === 'G') {
      if (confirmacionCheck) {

        showPhaseOverlay('Cambio a Base', 'Toque la pantalla para comenzar las mediciones de Base', '#4ade80');
        document.addEventListener('click', phaseClickHandlerType, {once: true});
        document.addEventListener('keydown', phaseClickHandlerType, {once: true});
      }
      else {
        setTipo('B');
      }

      sonidoCambioBase.play();
    } else {
      if (confirmacionCheck) {
        showPhaseOverlay('Cambio de Chapa', 'Toque la pantalla para comenzar con la siguiente chapa', '#60a5fa');
        document.addEventListener('click', phaseClickHandlerChapa, {once: true});
        document.addEventListener('keydown', phaseClickHandlerChapa, {once: true});
      }
      else {
        cambiarChapa(1);
      }

      sonidoCambioChapa.play();
    }
    guardarEnCache();
  }
  actualizarStats();
}

function cambiarChapa(delta) {
  if (chapa + delta < 1) return; //Limite inferior
  chapa += delta;
  document.getElementById('chapa').textContent = chapa;

  // Inicializar el objeto de resultados para la nueva chapa si no existe
  if (!resultados[chapa - 1]) {
    resultados[chapa - 1] = {'G': undefined, 'B': undefined};
    lecturas[chapa - 1] = {'G': [], 'B': []};
  }

  // Actualizar la información de tipo y promedio para la chapa actual
  setTipo('G');
}

function setTipo(nuevoTipo) {
  tipo = nuevoTipo;

  element = document.getElementById('tipo');
  if (tipo === 'G') {
    element.textContent = 'Galvanizado';
    element.classList.remove('bg-green-100', 'text-green-800');
    element.classList.add('bg-blue-100', 'text-blue-800');
  } else {
    element.textContent = 'Base';
    element.classList.remove('bg-blue-100', 'text-blue-800');
    element.classList.add('bg-green-100', 'text-green-800');
  }
  actualizarStats();
}


actualizarStats();



////////  BOTONES INFERIORES ////////

// Eliminar la ultima medida
function cancelarUltimaMedicion() {
  if (lecturas[chapa - 1][tipo].length > 0) {
    lecturas[chapa - 1][tipo].pop();
    actualizarStats();
    //guardarEnCache();
  }
}

// Borrar toda la chapa
function borrarDatosChapa() {
  lecturas[chapa - 1] = {'G': [], 'B': []};
  resultados[chapa - 1] = {'G': undefined, 'B': undefined};
  actualizarStats();
  guardarEnCache();
}

// Reiniciar todo el cache
function confirmarReiniciar() {
  if (confirm('¿Estás seguro de que quieres borrar todos los datos? Esta acción no se puede deshacer.')) {
    resultados = [{'G': undefined, 'B': undefined}];
    lecturas = [{'G': [], 'B': []}];
    chapa = 1;
    localStorage.clear();
    document.getElementById('chapa').textContent = chapa;
    setTipo('G');
  }
}

// Exportar mediciones
function exportarCSV() {
  let csv = 'Chapa,PromGalvanizado,PromBase\n';

  for (let i = 0; i < resultados.length; i++) {
    csv += `${i + 1},${resultados[i]['G']?.toFixed(1) || ''},${resultados[i]['B']?.toFixed(1) || ''}\n`;
  }

  const blob = new Blob([csv], {type: 'text/csv'});
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mediciones.csv';
  a.click();
  window.URL.revokeObjectURL(url);
}



///////////// CROP AREA /////////////

/// COMPUTADORA ////
cropArea.addEventListener('mousedown', (e) => {
  // Solo mover si no se está redimensionando (resizer = esquina)
  if (e.target !== cropArea || e.offsetX > cropArea.clientWidth - 20 && e.offsetY > cropArea.clientHeight - 20) return;

  isDragging = true;
  startX = e.clientX;
  startY = e.clientY;
  const rect = cropArea.getBoundingClientRect();
  const containerRect = document.getElementById('video-container').getBoundingClientRect();
  initialX = rect.left - containerRect.left;
  initialY = rect.top - containerRect.top;
  e.preventDefault();
});

document.addEventListener('mousemove', (e) => {
  if (!isDragging) return;

  const dx = e.clientX - startX;
  const dy = e.clientY - startY;

  cropArea.style.left = `${initialX + dx}px`;
  cropArea.style.top = `${initialY + dy}px`;
});

document.addEventListener('mouseup', () => {
  isDragging = false;
});


/// CELULAR ////
cropArea.addEventListener('touchstart', (e) => {
  if (e.target !== cropArea || e.touches[0].offsetX > cropArea.clientWidth - 20 && e.touches[0].offsetY > cropArea.clientHeight - 20) return;
  isDragging = true;
  startX = e.touches[0].clientX;
  startY = e.touches[0].clientY;
  const rect = cropArea.getBoundingClientRect();
  const containerRect = document.getElementById('video-container').getBoundingClientRect();
  initialX = rect.left - containerRect.left;
  initialY = rect.top - containerRect.top;
  e.preventDefault();
});

document.addEventListener('touchmove', (e) => {
  if (!isDragging) return;
  const dx = e.touches[0].clientX - startX;
  const dy = e.touches[0].clientY - startY;
  cropArea.style.left = `${initialX + dx}px`;
  cropArea.style.top = `${initialY + dy}px`;
});

document.addEventListener('touchend', () => {
  isDragging = false;
});



////////////////////////////////////////
//////// PANEL DE CONFIGURACION ////////
////////////////////////////////////////

// Abrir configuraciones
function toggleControls() {
  const panel = document.getElementById('controlsPanel');
  const arrow = document.getElementById('controlsArrow');
  panel.classList.toggle('hidden');
  arrow.textContent = panel.classList.contains('hidden') ? '▼' : '▲';
}

///// SLIDERS /////
widthSlider.addEventListener('input', () => {
  document.getElementById('widthValue').textContent = widthSlider.value + 'px';
  cropArea.style.width = widthSlider.value + 'px';
});

heightSlider.addEventListener('input', () => {
  document.getElementById('heightValue').textContent = heightSlider.value + 'px';
  cropArea.style.height = heightSlider.value + 'px';
});

//Modificar cantidad de lecturas
function actualizarCantidadLecturas() {
  const input = document.getElementById('cantidadLecturasInput');
  cantidadLecturas = parseInt(input.value) || 6;
  guardarEnCache();
}

//Checkbox de confirmación de cambio
function toggleConfirmation() {
  confirmacionCheck = !confirmacionCheck;
  guardarEnCache()
}

///// TIMER CONTROLS /////
const timerSlider = document.getElementById('timerSlider');
const timerEnabled = document.getElementById('timerEnabled');
const soundEnabled = document.getElementById('soundEnabled');

timerSlider.addEventListener('input', () => {
  document.getElementById('timerValue').textContent = timerSlider.value + 's';
  timerValue = timerSlider.value;
  guardarEnCache();
});

function toggleTimer() {
  const timerButton = document.getElementById('timerButton');

  if (!timerInterval) {
    timerInterval = setInterval(() => {
      capturarYLeer(true);
    }, timerSlider.value * 1000);
    timerButton.style.backgroundColor = '#93c5fd';
  } else {
    clearInterval(timerInterval);
    timerInterval = null;
    timerButton.style.backgroundColor = '#e5e7eb';
  }
}
timerSlider.addEventListener('change', () => {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
    toggleTimer();
  }
});

function toggleExperimentalFeature(feature) {
  if (feature === 'timer') {
    toggleTimer();
  } else if (feature === 'sound') {
    if (soundEnabled.checked) {
      iniciarDeteccion();
    } else {
      detecting = false;
    }
  }
}

//////// LIMITES ////////

function toggleLimites() {
  const contenido = document.getElementById("limitesContenido");
  const icono = document.getElementById("limitesIcono");
  const abierto = contenido.classList.toggle("hidden");
  icono.textContent = abierto ? "▼" : "▲";
}

// Actualizar límites
function actualizarLimites() {
  limites.G.min = parseFloat(document.getElementById("limiteGalvInf").value);
  limites.G.max = parseFloat(document.getElementById("limiteGalvSup").value);
  limites.B.min = parseFloat(document.getElementById("limiteBaseInf").value);
  limites.B.max = parseFloat(document.getElementById("limiteBaseSup").value);
  console.log("Límites actualizados:", limites);
  guardarEnCache();
}



///////////////////////////////////////////SONIDO////////////////////////
let audioContext;
let analyser;
let source;
let dataArray;
let detecting = false;

async function iniciarDeteccion() {
  if (detecting) return;

  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const stream = await navigator.mediaDevices.getUserMedia({audio: true});
  source = audioContext.createMediaStreamSource(stream);

  analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;

  source.connect(analyser);

  const bufferLength = analyser.frequencyBinCount;
  dataArray = new Uint8Array(bufferLength);

  detecting = true;
  detectarPitido();
}

function detectarPitido() {
  if (!detecting) return;

  analyser.getByteFrequencyData(dataArray);

  // Convertimos frecuencia binaria a Hz
  const sampleRate = audioContext.sampleRate;
  const binSize = sampleRate / analyser.fftSize;

  // Ejemplo: buscamos un pico entre 3900 y 4100 Hz
  const targetMin = Math.floor(3900 / binSize);
  const targetMax = Math.ceil(4100 / binSize);

  let maxAmp = 0;
  for (let i = targetMin; i <= targetMax; i++) {
    if (dataArray[i] > maxAmp) {
      maxAmp = dataArray[i];
    }
  }

  if (maxAmp > 180) { // umbral, se puede calibrar
    console.log("Pitido detectado, capturando...");
    capturarYLeer();
    // evitar capturas múltiples seguidas
    detecting = false;
    setTimeout(() => {
      detecting = true;
      detectarPitido();
    }, 3000); // espera 3 segundos para el próximo pitido
    return;
  }

  requestAnimationFrame(detectarPitido);
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.classList.add('toast');
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 1000);
  }, 3000);
}

document.addEventListener('keydown', (event) => {
  if (event.code === 'Space') {
    capturarYLeer();
  }
});