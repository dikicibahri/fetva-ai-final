const fs = require('fs');
const pdf = require('pdf-extraction');

console.log('📚 PDF Extraction başlatılıyor...\n');

// All PDF files to extract (inside Arşiv folder)
const pdfFiles = [
    { file: 'Arşiv/fetvalar.pdf', source: 'Diyanet Fetva Kitabı 2018' },
    { file: 'Arşiv/BUYUK-ISLAM-ILMIHALI-Omer-Nasuhi-BILMEN.pdf', source: 'Büyük İslam İlmihali - Ömer Nasuhi Bilmen' },
    { file: 'Arşiv/ilmihal_cilt_1.pdf', source: 'İlmihal Cilt 1 - TDV' },
    { file: 'Arşiv/ilmihal_cilt_2.pdf', source: 'İlmihal Cilt 2 - TDV' },
    { file: 'Arşiv/hadislerle_islam.pdf', source: 'Hadislerle İslam' },
    // Yeni eklenen kaynaklar
    { file: 'Arşiv/Ehli Sunnet Akaidi - Muhammed Pezdevi 1980.pdf', source: 'Ehli Sünnet Akaidi - Muhammed Pezdevi' },
    { file: 'Arşiv/Eş`ari ve Maturidi Mezhepleri Arasındaki Görüş Farkları - Mustafa Özgen.pdf', source: 'Eşari ve Maturidi Mezhepleri - Mustafa Özgen' },
    { file: 'Arşiv/Nimet-i İslam (Mehmet Zihni Efendi).pdf', source: 'Nimet-i İslam - Mehmet Zihni Efendi' },
    { file: 'Arşiv/Mızraklı İlmihali.pdf', source: 'Mızraklı İlmihali' },
    { file: 'Arşiv/İmamı Azam Ebu Hanife_nin Görüşleri.pdf', source: 'İmam-ı Azam Ebu Hanife\'nin Görüşleri' },
    { file: 'Arşiv/Fıkhı Ekber Şerhi.pdf', source: 'Fıkh-ı Ekber Şerhi' }
];

async function extractAll() {
    let allContent = [];

    for (const pdfInfo of pdfFiles) {
        try {
            console.log(`📖 ${pdfInfo.file} okunuyor...`);
            const dataBuffer = fs.readFileSync(pdfInfo.file);
            const data = await pdf(dataBuffer);

            // Split by lines, keep those with useful content
            const lines = data.text
                .split(/\n+/)
                .map(line => line.trim())
                .filter(line => {
                    // Minimum length - lowered to catch more content
                    if (line.length < 20) return false;
                    // Skip pure page numbers
                    if (/^\d+$/.test(line)) return false;
                    // Skip TOC entries (dots followed by page number)
                    if (/\.{3,}\s*\d+$/.test(line)) return false;
                    return true;
                })
                .map(line => ({
                    text: line,
                    source: pdfInfo.source
                }));

            console.log(`   ✅ ${lines.length} satır çıkarıldı`);
            allContent = allContent.concat(lines);
        } catch (err) {
            console.error(`   ❌ Hata: ${pdfInfo.file}`, err.message);
        }
    }

    // Save as JavaScript file for embedding
    const jsContent = `// Auto-generated from PDF files
// Total: ${allContent.length} items
window.FETVA_DATA = ${JSON.stringify(allContent, null, 0)};`;

    fs.writeFileSync('data.js', jsContent);
    console.log(`\n✅ Toplam ${allContent.length} kayıt data.js dosyasına yazıldı`);

    // Also save JSON for reference
    fs.writeFileSync('data.json', JSON.stringify({ content: allContent }, null, 2));
}

extractAll().catch(err => {
    console.error('Genel hata:', err);
    fs.writeFileSync('error.log', 'Error: ' + err.message + '\nStack: ' + err.stack);
});
