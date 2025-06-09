let video = document.querySelector('video');
let canvas = document.querySelector('canvas');
let isCameraOn = false;
let stream = null;

// Start camera
async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    isCameraOn = true;
  } catch (err) {
    console.error('Camera access error:', err);
  }
}

// Stop camera
function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    video.srcObject = null;
    isCameraOn = false;
  }
}

// Capture frame and send to Flask
async function captureFrame() {
  if (!isCameraOn) return;

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext('2d');
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  const dataUrl = canvas.toDataURL('image/jpeg');

  try {
    const response = await fetch('http://localhost:5000/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: dataUrl })
    });

    const result = await response.json();
    console.log(result);

    alert(`Label: ${result.prediction === 1 ? 'Clear' : 'Not Clear'}\nConfidence: ${(result.probability[result.prediction] * 100).toFixed(2)}%`);

  } catch (error) {
    console.error('Prediction error:', error);
  }
}

// Expose to HTML
window.startCamera = startCamera;
window.stopCamera = stopCamera;
window.Captureframe = captureFrame;
