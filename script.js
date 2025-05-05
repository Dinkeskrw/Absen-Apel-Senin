document.addEventListener('DOMContentLoaded', function() {
    const namaInput = document.getElementById('nama');
    const nipInput = document.getElementById('nip');
    const pangkatGolonganInput = document.getElementById('pangkat-golongan');
    const jabatanInput = document.getElementById('jabatan');
    const unitKerjaInput = document.getElementById('unit-kerja');
    const koordinatInput = document.getElementById('koordinat');
    const ambilLokasiButton = document.getElementById('ambil-lokasi');
    const videoElement = document.getElementById('video');
    const canvasElement = document.getElementById('canvas');
    const hasilFotoElement = document.getElementById('hasil-foto');
    const ambilFotoButton = document.getElementById('ambil-foto');
    const absenMasukButton = document.getElementById('absen-masuk');
    const absenKeluarButton = document.getElementById('absen-keluar');
    const formAbsensi = document.getElementById('form-absensi');
    const lokasiError = document.getElementById('lokasi-error');

    // Ganti dengan URL Aplikasi Web Google Apps Script Anda
    const googleAppsScriptURL = 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL';

    const targetLatitude = -6.3178501;
    const targetLongitude = 107.3071573;
    const radius = 30; // dalam meter

    let streamKamera;
    let fotoBase64;
    let currentLatitude;
    let currentLongitude;

    // Fungsi untuk menghitung jarak antara dua titik koordinat (Haversine formula)
    function calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3; // radius bumi dalam meter
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        const distance = R * c; // dalam meter
        return distance;
    }

    // Fungsi untuk mendapatkan lokasi
    function dapatkanLokasi() {
        if (navigator.geolocation) {
            koordinatInput.value = 'Mencari lokasi...';
            lokasiError.style.display = 'none';
            absenMasukButton.disabled = true;
            absenKeluarButton.disabled = true;
            navigator.geolocation.getCurrentPosition(posisi => {
                currentLatitude = posisi.coords.latitude;
                currentLongitude = posisi.coords.longitude;
                koordinatInput.value = `${currentLatitude}, ${currentLongitude}`;
                const distance = calculateDistance(currentLatitude, currentLongitude, targetLatitude, targetLongitude);
                if (distance <= radius) {
                    lokasiError.style.display = 'none';
                    absenMasukButton.disabled = false;
                    absenKeluarButton.disabled = false;
                } else {
                    lokasiError.style.display = 'block';
                    absenMasukButton.disabled = true;
                    absenKeluarButton.disabled = true;
                }
            }, () => {
                koordinatInput.value = 'Gagal mendapatkan lokasi.';
                lokasiError.style.display = 'block';
                lokasiError.textContent = 'Gagal mendapatkan lokasi.';
                absenMasukButton.disabled = true;
                absenKeluarButton.disabled = true;
            });
        } else {
            koordinatInput.value = 'Geolocation tidak didukung oleh browser Anda.';
            lokasiError.style.display = 'block';
            lokasiError.textContent = 'Geolocation tidak didukung oleh browser Anda.';
            absenMasukButton.disabled = true;
            absenKeluarButton.disabled = true;
        }
    }

    // Event listener untuk tombol Ambil Lokasi
    ambilLokasiButton.addEventListener('click', dapatkanLokasi);

    // Fungsi untuk mengaktifkan kamera
    async function aktifkanKamera() {
        try {
            streamKamera = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
            videoElement.srcObject = streamKamera;
        } catch (error) {
            console.error('Gagal mengakses kamera.', error);
            alert('Gagal mengakses kamera. Pastikan izin kamera diberikan.');
        }
    }

    // Fungsi untuk mengambil foto
    function ambilFoto() {
        if (streamKamera) {
            const context = canvasElement.getContext('2d');
            canvasElement.width = videoElement.videoWidth;
            canvasElement.height = videoElement.videoHeight;
            context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
            fotoBase64 = canvasElement.toDataURL('image/png');
            hasilFotoElement.src = fotoBase64;
            hasilFotoElement.style.display = 'block';
        } else {
            alert('Kamera belum aktif.');
        }
    }

    // Event listener untuk tombol Ambil Foto
    ambilFotoButton.addEventListener('click', ambilFoto);
    aktifkanKamera(); // Aktifkan kamera saat halaman dimuat

    // Fungsi untuk mengirim data absensi ke Google Apps Script
    async function kirimAbsensi(jenisAbsensi) {
        const nama = namaInput.value.trim();
        const nip = nipInput.value.trim();
        const pangkat = pangkatGolonganInput.value.trim();
        const jabatan = jabatanInput.value.trim();
        const unitKerja = unitKerjaInput.value.trim();

        if (nama && nip && pangkat && jabatan && unitKerja && currentLatitude && currentLongitude && fotoBase64) {
            const distance = calculateDistance(currentLatitude, currentLongitude, targetLatitude, targetLongitude);
            if (distance <= radius) {
                const waktu = new Date().toLocaleString();
                const dataAbsensi = {
                    nama: nama,
                    nip: nip,
                    pangkat: pangkat,
                    jabatan: jabatan,
                    unitKerja: unitKerja,
                    koordinat: `${currentLatitude}, ${currentLongitude}`,
                    foto: fotoBase64,
                    waktu: waktu,
                    jenis: jenisAbsensi
                };

                try {
                    const response = await fetch(googleAppsScriptURL, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(dataAbsensi)
                    });

                    const result = await response.json();
                    if (result.result === 'success') {
                        alert('Absensi berhasil!');
                        formAbsensi.reset();
                        koordinatInput.value = 'Mencari lokasi...';
                        hasilFotoElement.style.display = 'none';
                        fotoBase64 = null;
                        dapatkanLokasi();
                    } else {
                        alert('Gagal menyimpan absensi: ' + result.message);
                    }
                }
