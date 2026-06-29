// ============================================================
// CStat — qr.js  |  QR Code Generation & WebRTC Scanning
// ============================================================

const QRManager = {
  // Generate QR payload for a user
  getPayload(user) {
    return JSON.stringify({
      id: user.id,
      role: user.role,
      name: user.name,
      dept: user.department,
      sig: btoa(user.id + ':' + user.role + ':cstat2026')
    });
  },

  // Render a QR code into an element
  render(containerId, user, size = 200) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    new QRCode(container, {
      text: this.getPayload(user),
      width: size,
      height: size,
      colorDark: '#6C63FF',
      colorLight: '#0f1225',
      correctLevel: QRCode.CorrectLevel.H
    });
  },

  // Validate a scanned payload
  validate(payload) {
    try {
      const data = JSON.parse(payload);
      if (!data.id || !data.role || !data.sig) return null;
      const expected = btoa(data.id + ':' + data.role + ':cstat2026');
      if (data.sig !== expected) return null;
      return data;
    } catch (e) { return null; }
  }
};

// ─── WebRTC Camera Scanner ────────────────────────────────────
const QRScanner = {
  stream: null,
  animFrame: null,
  active: false,
  onResult: null,

  // Start scanning — renders into a container div
  // container: DOM element, onResult: callback(parsedPayload | null)
  async start(container, onResult) {
    this.stop(); // clean previous session
    this.onResult = onResult;

    // Build scanner UI
    container.innerHTML = `
      <div class="scanner-wrap">
        <div class="scanner-frame">
          <video id="cstat-scanner-video" autoplay playsinline muted></video>
          <canvas id="cstat-scanner-canvas" style="display:none"></canvas>
          <div class="scanner-overlay">
            <div class="scanner-box">
              <span class="corner tl"></span>
              <span class="corner tr"></span>
              <span class="corner bl"></span>
              <span class="corner br"></span>
              <div class="scanner-line"></div>
            </div>
            <p class="scanner-hint">Point at a CStat QR code</p>
          </div>
        </div>
        <button class="btn btn-danger btn-sm mt-2" id="stop-scanner-btn" style="width:100%">
          <i class="icon-x"></i> Stop Scanner
        </button>
      </div>
    `;

    document.getElementById('stop-scanner-btn').addEventListener('click', () => this.stop());

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 }, height: { ideal: 480 } }
      });
      const video = document.getElementById('cstat-scanner-video');
      video.srcObject = this.stream;
      this.active = true;
      video.addEventListener('loadedmetadata', () => {
        video.play();
        this._scan();
      });
    } catch (err) {
      console.error('Camera error:', err);
      container.innerHTML = `<div class="scanner-error">
        <div class="error-icon">📷</div>
        <p>Camera access denied or unavailable.</p>
        <p class="text-muted">Please allow camera permission and reload.</p>
        <small>${err.message}</small>
      </div>`;
    }
  },

  _scan() {
    if (!this.active) return;
    const video = document.getElementById('cstat-scanner-video');
    const canvas = document.getElementById('cstat-scanner-canvas');
    if (!video || !canvas) return;
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      try {
        const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
        if (code && code.data) {
          const result = QRManager.validate(code.data);
          if (result) {
            this.stop();
            if (this.onResult) this.onResult(result);
            return;
          }
        }
      } catch(e) {}
    }
    this.animFrame = requestAnimationFrame(() => this._scan());
  },

  stop() {
    this.active = false;
    if (this.animFrame) { cancelAnimationFrame(this.animFrame); this.animFrame = null; }
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    const video = document.getElementById('cstat-scanner-video');
    if (video) { video.srcObject = null; }
  }
};
