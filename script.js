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

    // Ganti dengan URL Aplikasi Web Google Apps Script Anda
    const googleAppsScriptURL = 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL';

    // Ganti dengan API Key Google Maps Platform Anda
    const googleMapsApiKey = 'YOUR_GOOGLE_MAPS_API_KEY';

    let streamKamera;
    let fotoBase64;
    let currentLatitude;
    let currentLongitude;

    // Fungsi untuk mendapatkan nama tempat dari koordinat menggunakan Geocoding API
    async function getPlaceName(latitude, longitude) {
        const geocodingApiUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${googleMapsApiKey}`;
        try {
            const response = await fetch(geocodingApiUrl);
            const data = await response.json();
            if (data.results && data.results.length > 0) {
                return data.results[0].formatted_address;
            } else {
                return 'Nama tempat tidak ditemukan';
            }
        } catch (error) {
            console.error('Gagal mendapatkan nama tempat:', error);
            return 'Gagal mendapatkan nama tempat';
        }
    }

    // Fungsi untuk mendapatkan lokasi
    function dapatkanLokasi() {
        if (navigator.geolocation) {
            koordinatInput.value = 'Mencari lokasi...';
            navigator.geolocation.getCurrentPosition(async posisi => {
                currentLatitude = posisi.coords.latitude;
                currentLongitude = posisi.coords.longitude;
                const placeName = await getPlaceName(currentLatitude, currentLongitude);
                koordinatInput.value = `${currentLatitude}, ${currentLongitude} (${placeName})`;
            }, () => {
                koordinatInput.value = 'Gagal mendapatkan lokasi.';
            });
        } else {
            koordinatInput.value = 'Geolocation tidak didukung oleh browser Anda.';
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
            const waktu = new Date().toLocaleString();
            const dataAbsensi = {
                nama: nama,
                nip: nip,
                pangkat: pangkat,
                jabatan: jabatan,
                unitKerja: unitKerja,
                koordinat: `${currentLatitude}, ${currentLongitude}`,
                tempat: koordinatInput.value.split('(').pop().slice(0, -1),
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
            } catch (error) {
                console.error('Terjadi kesalahan saat mengirim data:', error);
                alert('Terjadi kesalahan saat mengirim data absensi.');
            }
        } else {
            alert('Harap isi semua data, ambil lokasi, dan ambil foto sebelum absen.');
        }
    }

    // Event listener untuk tombol Absen Masuk
    absenMasukButton.addEventListener('click', function() {
        kirimAbsensi('Masuk');
    });

    // Event listener untuk tombol Absen Keluar
    absenKeluarButton.addEventListener('click', function() {
        kirimAbsensi('Keluar');
    });

    // Ambil lokasi awal saat halaman dimuat
    dapatkanLokasi();
});
