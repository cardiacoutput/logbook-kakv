/**
 * e-Logbook KAKV — pembuat Google Form + Google Sheet
 * "Database Pasien Anestesi Kardiovaskular".
 *
 * Cara pakai:
 *  1. Buka https://script.google.com dengan akun Google pemilik database → New project.
 *  2. Hapus isi editor, tempel seluruh skrip ini, simpan (ikon disket).
 *  3. Pilih fungsi "buatDatabase" lalu tekan Run. Izinkan akses (Review permissions →
 *     pilih akun → Advanced → Go to project → Allow).
 *  4. Setelah selesai, buka Execution log atau tab "Info" di Google Sheet yang terbentuk.
 *     Salin baris "LINK TEMPLATE" lalu kirimkan ke pengembang aplikasi.
 *
 * Skrip cukup dijalankan SEKALI. Menjalankan ulang akan membuat form baru.
 */
function buatDatabase() {
  var form = FormApp.create('Database Pasien Anestesi Kardiovaskular');
  form.setDescription('Diisi dari e-Logbook KAKV (tombol "Lengkapi Database"). Sebagian isian sudah terisi otomatis — periksa dan lengkapi sebelum menekan Kirim.');
  form.setCollectEmail(true);
  form.setAllowResponseEdits(true);
  form.setProgressBar(true);
  form.setConfirmationMessage('Data pasien tersimpan di database. Terima kasih.');

  var teks = function (judul, bantuan, panjang) {
    var it = panjang ? form.addParagraphTextItem() : form.addTextItem();
    it.setTitle(judul);
    if (bantuan) it.setHelpText(bantuan);
    return it;
  };

  // Halaman 1 — identitas & pre-operasi
  form.addSectionHeaderItem().setTitle('Identitas & pre-operasi');
  teks('Sheet', 'RSHS / SHBC / CATHLAB / JEJARING LAIN');
  teks('Tanggal', 'dd-mm-yyyy');
  teks('Nama Pasien');
  teks('NRM');
  teks('JK', 'L / P');
  teks('Usia');
  teks('BB (kg)');
  teks('TB (cm)');
  teks('Diagnosis', '', true);
  teks('Tindakan');
  teks('Echo Pre Op', '', true);
  teks('EF');
  teks('Kateterisasi/ Angiografi/ RHC', '', true);
  teks('ASA');
  teks('Lab Awal', '', true);
  teks('AGD awal');
  teks('Lactat Awal');
  var cpb = form.addMultipleChoiceItem().setTitle('Memakai CPB?').setRequired(true);

  // Halaman 2 — khusus kasus dengan CPB
  var halCpb = form.addPageBreakItem().setTitle('CPB & antikoagulasi');
  teks('Lama CPB (menit)');
  teks('Aox (menit)');
  teks('Iskemik (menit)');
  teks('Defib');
  teks('ACT Awal');
  teks('Jumlah Heparin (mg)');
  teks('ACT Post Heparin');
  teks('Protamin (mg)');
  teks('ACT Post Protamin');

  // Halaman 3 — intraoperatif umum
  var halIntra = form.addPageBreakItem().setTitle('Intraoperatif');
  teks('Obat Induksi', '', true);
  teks('Lama Op (menit)');
  teks('Lab Akhir Op', '', true);
  teks('AGD akhir');
  teks('Lactat Akhir');
  teks('CO CI');
  teks('Perdarahan');
  teks('Rencana Transfusi');
  teks('Kristaloid');
  teks('Koloid');
  teks('Urine');
  teks('Urine cc/kg/jam');

  // Halaman 4 — pasca-operasi & tim
  form.addPageBreakItem().setTitle('Pasca-operasi, luaran & tim');
  teks('Analgetik', '', true);
  teks('Support Terakhir', '', true);
  teks('Ekstubasi');
  teks('Lama Rawat Intensif');
  teks('Semi Intensif');
  teks('Ruangan');
  teks('Luaran', 'Hidup / Meninggal');
  teks('DPJP BTKV', '', true);
  teks('DPJP Anestesi');
  teks('SP2/ Fellow');
  teks('Residen');
  teks('Keterangan', '', true);

  cpb.setChoices([cpb.createChoice('Ya', halCpb), cpb.createChoice('Tidak', halIntra)]);

  // Google Sheet tujuan
  var ss = SpreadsheetApp.create('Database Pasien Anestesi Kardiovaskular (respons)');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());

  // Link template: setiap isian diisi dengan judulnya sendiri, supaya aplikasi tahu kode entry tiap kolom
  var resp = form.createResponse();
  form.getItems().forEach(function (it) {
    var t = it.getType();
    if (t === FormApp.ItemType.TEXT) resp.withItemResponse(it.asTextItem().createResponse(it.getTitle()));
    else if (t === FormApp.ItemType.PARAGRAPH_TEXT) resp.withItemResponse(it.asParagraphTextItem().createResponse(it.getTitle()));
    else if (t === FormApp.ItemType.MULTIPLE_CHOICE) resp.withItemResponse(it.asMultipleChoiceItem().createResponse('Ya'));
  });
  var template = resp.toPrefilledUrl();

  var info = ss.insertSheet('Info');
  info.getRange('A1:B5').setValues([
    ['Form (untuk diisi)', form.getPublishedUrl()],
    ['Form (untuk diedit)', form.getEditUrl()],
    ['Sheet respons', ss.getUrl()],
    ['LINK TEMPLATE (kirim ke pengembang aplikasi)', template],
    ['Dibuat', new Date()]
  ]);
  info.setColumnWidth(1, 320);

  Logger.log('Form diisi   : ' + form.getPublishedUrl());
  Logger.log('Form diedit  : ' + form.getEditUrl());
  Logger.log('Sheet respons: ' + ss.getUrl());
  Logger.log('LINK TEMPLATE: ' + template);
}
