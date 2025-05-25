# OCR Cámara Web

**OCR Cámara Web** es una aplicación web progresiva (PWA) que permite capturar automáticamente mediciones desde un micrómetro ultrasónico utilizando la cámara del dispositivo, mediante reconocimiento óptico de caracteres (OCR) con [Tesseract.js](https://github.com/naptha/tesseract.js). Está optimizada para funcionar sin conexión y puede instalarse como una app en cualquier dispositivo móvil.

Este proyecto está diseñado para **asistir en la medición y registro automático de espesores de galvanizado y pintura base en chapas metálicas**, reduciendo errores humanos y acelerando el proceso de control de calidad.


## 🎯 Objetivo

Facilitar la toma de múltiples mediciones por chapa de forma rápida, precisa y con mínima intervención manual.
El sistema captura automáticamente los valores que aparecen en pantalla en un **medidor de espesores**, los registra y analiza, calculando promedios y desviaciones para cada fase de medición.

---

## ✨ Características principales

* 📸 Captura en tiempo real desde la cámara del dispositivo.
* 🔍 OCR offline con Tesseract.js.
* 📊 Estadísticas en vivo (promedio y desviación estándar).
* 🔁 Alternancia entre tipos de medición: *galvanizado* y *base*.
* 💾 Persistencia local mediante `localStorage`.
* 📁 Exportación de resultados en formato CSV.

---

## 🎮 Modos de captura

* **Manual con botón** de captura.
* **Manual con teclado físico**, usando la tecla *espacio*.
* **Automático con temporizador**, mediante el botón de reloj.

> 💡 Existe un modo *experimental* de captura por sonido, actualmente en desarrollo. Su inclusión es simbólica y no está optimizada para producción.

---

## ⚙️ Configuraciones de captura

* 🟦 **Zona de recorte** personalizada (drag & drop).
* 🔢 **Cantidad de capturas** a promediar por fase.
* ✅ **Confirmación de cambio de fase**, para evitar lecturas incorrectas.
* ⏱️ **Intervalo de captura** en el modo temporizador.
* 📉 **Límites de validación**, para descartar valores atípicos o erróneos.

---

## Controles y botones adicionales

### Botones de cambio de fase y chapa

* **Cambiar tipo de medición (fase)**
  🔁 Botón que alterna entre **galvanizado** y **base/pintura**.
  Se puede usar manualmente o tras completar las capturas requeridas de la fase actual.
  Especialmente util si se quiere releer o añadir lecturas a una fase del proceso

* **Siguiente chapa**
  🆕 Crea un nuevo registro para una nueva chapa.
  Reinicia las capturas, promedio y desviación para ambos tipos de medición.

### Botones de control de captura

* **Cancelar última captura**
  🔄 Descarta la última medición registrada y vuelve a capturar (ideal para corregir errores de OCR).

* **Releer captura actual**
  ✖️ Descarta la medición actual **sin registrar ningún valor**.

* **Reiniciar todo**
  🗑 Borra completamente todos los datos guardados, incluyendo chapas, promedios y estadísticas almacenadas en `localStorage`.
  Útil para comenzar un nuevo lote o reiniciar el dispositivo en producción.

---

## 🧠 Proceso de funcionamiento

### 1. Captura en tiempo real

La aplicación accede a la cámara mediante `getUserMedia` y muestra una vista previa.

### 2. Zona de captura

El usuario define una zona de recorte donde aparecerán los valores a reconocer.

### 3. Procesamiento y OCR

* Se captura la imagen de la zona seleccionada.
* Se binariza (blanco y negro) para mayor contraste.
* Se ejecuta Tesseract.js para extraer el número visible.

### 4. Validación y almacenamiento

* Se descartan lecturas fuera de los límites configurados (por ejemplo, para evitar confundir pintura con galvanizado).
* En modo temporizador, se descartan valores consecutivos iguales para evitar duplicados.
* Los datos válidos se asocian con una chapa y un tipo de medición.
* Se calculan promedio y desviación.
* Toda la información se guarda en `localStorage`.

### 5. Cambio de fase y confirmación

Una vez completadas las mediciones de una fase (ej. galvanizado), se avanza automáticamente a la siguiente (ej. base).

> Si la confirmación está activada, se mostrará una ventana entre fases para permitir pausar o detener la captura, especialmente útil en el modo automático.

---

## 📦 Instalación y uso

Puedes usar la app directamente desde el navegador. Es posible **instalarla como app** desde tu dispositivo móvil o PC gracias a su naturaleza de PWA.

🔗 **[Ir a la demo](https://parisnicolas.github.io/OCR-lectorDeMicrometro)**


---

## 📤 Exportación de datos

Todos los datos capturados se pueden exportar en formato `.CSV`, incluyendo:

| Chapa | PromGalvanizado (µm) | PromBase (µm) |
| ----- | -------------------- | ------------- |
| 1     | 5.5                 | 14.5          |
| 2     | 5.7                 | 15.1          |
| 3     | 5.8                 | 14.9          |

---

## 🧪 Tecnologías utilizadas

* **Tesseract.js** – Reconocimiento óptico de caracteres.
* **JavaScript** – Lógica de captura y procesamiento.
* **HTML/CSS** – Interfaz web.
* **localStorage** – Persistencia de datos offline.
* **Web APIs** – Acceso a cámara y eventos del dispositivo.

---

## 📌 Notas

* La app funciona completamente offline luego de ser cargada una vez.
* Compatible con dispositivos Android, iOS y navegadores modernos.
* Ideal para entornos industriales donde se requiera movilidad y rapidez sin depender de papel o equipos adicionales.
