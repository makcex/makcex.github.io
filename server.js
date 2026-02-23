const http = require('http')
const fs = require('fs')
const path = require('path')
const { formidable } = require('formidable')
const PORT = process.env.PORT || 3000
const sharp = require('sharp');

// ===== DATA PRODUK =====
const products = []
const dataFile = path.join(__dirname, 'products.json')

// Load produk jika ada file
if (fs.existsSync(dataFile)) {
    try {
        const raw = fs.readFileSync(dataFile)
        const jsonData = JSON.parse(raw)
        products.push(...jsonData)
    } catch(err) {
        console.error('Gagal membaca products.json', err)
    }
}
        // ===== DATA UTANG =====
const utangFile = path.join(__dirname, 'utang.json')
const utangData = []

if (fs.existsSync(utangFile)) {
    try {
        const raw = fs.readFileSync(utangFile)
        const jsonData = JSON.parse(raw)
        utangData.push(...jsonData)
    } catch(err) {
        console.error('Gagal membaca utang.json', err)
    }
}

// ===== DATA CHECKOUT =====
const checkoutFile = path.join(__dirname, 'checkout.json')
const checkoutData = [] // setiap transaksi disimpan di sini

if (fs.existsSync(checkoutFile)) {
    try {
        const raw = fs.readFileSync(checkoutFile)
        const jsonData = JSON.parse(raw)
        checkoutData.push(...jsonData)
    } catch(err) {
        console.error('Gagal membaca checkout.json', err)
    }
}

// ===== ROUTES STATIC =====
const routes = {
    '/': '/index.html',
    '/dashboard': '/index.html',
    '/adm1n': '/admin.html'
}

// ===== SERVER =====
const server = http.createServer((req, res) => {

    // ===== HALAMAN ADMIN =====
    if(req.url.startsWith('/adm1n')) {
        const url = new URL(req.url, `http://${req.headers.host}`)
        const key = url.searchParams.get('k')  // ?k=abc
        if(key !== 'abc'){
            res.writeHead(403, {'Content-Type':'text/plain'})
            return res.end('Forbidden: Kamu tidak boleh akses admin 😎')
        }
        fs.readFile(path.join(__dirname,'/admin.html'), (err, data) => {
            if(err){
                res.writeHead(500)
                return res.end('Server error')
            }
            res.writeHead(200, {'Content-Type':'text/html'})
            res.end(data)
        })
        return
    }

    // ===== MENANGANI GAMBAR =====
    if(req.url.startsWith('/img/')) {
        const imgPath = path.join(__dirname, 'img', path.basename(req.url))
        fs.readFile(imgPath, (err, data) => {
            if(err){
                res.writeHead(404)
                return res.end('Gambar tidak ditemukan')
            }
            const ext = path.extname(imgPath)
            const mimeTypes = { '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.png':'image/png','.webp':'image/webp' }
            res.writeHead(200, {'Content-Type': mimeTypes[ext] || 'application/octet-stream'})
            res.end(data)
        })
        return
    }

    // ===== STATIC HTML =====
    const page = routes[req.url]
    if(page){
        fs.readFile(path.join(__dirname, page), (err, data) => {
            if(err){
                res.writeHead(500)
                return res.end('Server error')
            }
            res.writeHead(200, {'Content-Type':'text/html'})
            res.end(data)
        })
        return
    }

    // ===== GET PRODUK =====
    if(req.method === 'GET' && req.url === '/products'){
        res.writeHead(200, {'Content-Type':'application/json'})
        return res.end(JSON.stringify(products))
    }

    // ===== POST PRODUK BARU =====
    if(req.method === 'POST' && req.url === '/products'){
        let body = ''
        req.on('data', chunk => body += chunk)
        req.on('end', () => {
            let data
            try {
                data = JSON.parse(body)
            } catch {
                res.writeHead(400)
                return res.end('JSON tidak valid')
            }

            const produkBaru = {
                id: Date.now(),
                nama: data.nama,
                harga: Number(data.harga),
                jenis: data.jenis,
                stok: Number(data.stok),
                foto: data.gbr
            }
            products.push(produkBaru)
            fs.writeFile(dataFile, JSON.stringify(products, null, 2), err => {
                if(err) console.error('Gagal menyimpan produk', err)
            })

            res.writeHead(201, {"Content-Type":"application/json"})
            res.end(JSON.stringify({success:true, produk:produkBaru}))
        })
        return
    }

    // ===== UPLOAD GAMBAR =====
    if(req.method === 'POST' && req.url === '/upload'){
    if(!fs.existsSync('img')) fs.mkdirSync('img')

    const form = formidable({ uploadDir: path.join(__dirname, 'img'), keepExtensions: true })

    form.parse(req, async (err, fields, files) => {
      if(err){
        res.writeHead(500, {'Content-Type':'application/json'})
        return res.end(JSON.stringify({success:false, message: err.message}))
      }
      if(!files.img){
        res.writeHead(400, {'Content-Type':'application/json'})
        return res.end(JSON.stringify({success:false, message:'File img tidak ditemukan'}))
      }

      const file = Array.isArray(files.img)? files.img[0] : files.img
      const oldPath = file.filepath
      const webpFileName = path.parse(file.newFilename || path.basename(oldPath)).name + '.webp'
      const outputPath = path.join(__dirname, 'img', webpFileName)

      try {
        await sharp(oldPath)
          .resize(500)
          .webp({ quality: 75 })
          .toFile(outputPath)

        fs.unlinkSync(oldPath)

        res.writeHead(200, {'Content-Type':'application/json'})
        res.end(JSON.stringify({success:true, fileName: webpFileName}))

      } catch (error) {
        console.error('Error convert image:', error)
        res.writeHead(500, {'Content-Type':'application/json'})
        res.end(JSON.stringify({success:false, message: 'Gagal convert gambar'}))
      }
    })
    return
  }
    // ===== CHECKOUT =====
if(req.method === 'POST' && req.url === '/checkout'){
    let body = ''
    req.on('data', chunk => body += chunk)
    req.on('end', () => {
        let data
        try {
            data = JSON.parse(body)
        } catch {
            res.writeHead(400, {'Content-Type':'application/json'})
            return res.end(JSON.stringify({success:false, message:'JSON salah'}))
        }

        const {user, keranjang} = data
        if(!user || !keranjang || keranjang.length === 0){
            res.writeHead(400, {'Content-Type':'application/json'})
            return res.end(JSON.stringify({success:false, message:'Data checkout tidak lengkap'}))
        }

        // CEK STOK DULU
for(let item of keranjang){

    // ✅ Lewati barang manual
    if(item.manual) continue

    const produk = products.find(p => p.id === item.id)

    if(!produk || produk.stok < item.jumlah){
        res.writeHead(400, {'Content-Type':'application/json'})
        return res.end(JSON.stringify({
            success:false,
            message:`Stok ${item.nama} tidak cukup`
        }))
    }
}

        // UPDATE STOK PRODUK (server-side)
        keranjang.forEach(item => {

    // ✅ Jangan kurangi stok kalau manual
    if(item.manual) return

    const produk = products.find(p => p.id === item.id)
    if(produk){
        produk.stok -= item.jumlah
    }
})
        fs.writeFile(dataFile, JSON.stringify(products, null, 2), err => {
    if(err) console.error('Gagal menyimpan products.json', err)
})


        // HITUNG TOTAL
        const total = keranjang.reduce((sum, item) => sum + item.harga * item.jumlah, 0)

        // SIMPAN TRANSAKSI
        checkoutData.push({
            id: Date.now(),
            user,
            cart: keranjang,
            total,
            tanggal: new Date().toISOString()
        })

        // SIMPAN KE FILE checkout.json agar permanen
        fs.writeFile(path.join(__dirname, 'checkout.json'), JSON.stringify(checkoutData, null, 2), err => {
            if(err) console.error('Gagal menyimpan checkout.json', err)
        })

        res.writeHead(200, {'Content-Type':'application/json'})
        res.end(JSON.stringify({success:true, total}))
    })
    return
}


    // ===== PENJUALAN TOKO (OFFLINE) =====
if(req.method === 'POST' && req.url === '/jual'){
    let body = ''

    req.on('data', chunk => body += chunk)

    req.on('end', () => {
        let data
        try {
            data = JSON.parse(body)
        } catch {
            res.writeHead(400, {'Content-Type':'application/json'})
            return res.end(JSON.stringify({
                success:false,
                message:'JSON salah'
            }))
        }

        const { items } = data   // items = array barang yg dijual

        if(!items || items.length === 0){
            res.writeHead(400, {'Content-Type':'application/json'})
            return res.end(JSON.stringify({
                success:false,
                message:'Data penjualan kosong'
            }))
        }
        console.log("DATA MASUK /jual:");
console.log(JSON.stringify(items, null, 2));

        // CEK STOK DULU
for(let item of items){

    // ✅ LEWATI BARANG MANUAL
    if(item.manual){
        console.log("Lewati manual:", item.nama);
        continue;
    }

    const produk = products.find(p => String(p.id) === String(item.id))

    if(!produk){
        res.writeHead(400, {'Content-Type':'application/json'})
        return res.end(JSON.stringify({
            success:false,
            message:`Produk ${item.nama} tidak ditemukan`
        }))
    }

    if(produk.stok < item.jumlah){
        res.writeHead(400, {'Content-Type':'application/json'})
        return res.end(JSON.stringify({
            success:false,
            message:`Stok ${item.nama} tidak cukup`
        }))
    }
}


        // UPDATE STOK
       items.forEach(item => {

    if(item.manual) return;

    const produk = products.find(p => String(p.id) === String(item.id))
    if(produk){
        produk.stok -= item.jumlah
    }
})
        fs.writeFile(dataFile, JSON.stringify(products, null, 2), err => {
    if(err) console.error('Gagal menyimpan products.json', err)
})


        // HITUNG TOTAL
        const total = items.reduce((sum, item) => {
            return sum + item.harga * item.jumlah
        }, 0)

        // SIMPAN TRANSAKSI (tanpa user online)
        checkoutData.push({
            id: Date.now(),
            user: { nama: "Pembeli Toko", hp: "-", alamat: "-" },
            cart: items,
            total,
            tanggal: new Date().toISOString(),
            tipe: "offline"
        })

        fs.writeFile(checkoutFile, JSON.stringify(checkoutData, null, 2), err => {
    if(err) console.error('Gagal menyimpan checkout.json', err)
})


        res.writeHead(200, {'Content-Type':'application/json'})
        res.end(JSON.stringify({
            success:true,
            total
        }))
    })

    return
}


    // ===== GET DATA ADMIN (checkoutData) =====
    if(req.method === 'GET' && req.url.startsWith('/admin-data')){
        const url = new URL(req.url, `http://${req.headers.host}`)
        const key = url.searchParams.get('k')  // ?k=abc
        if(key !== 'abc'){
            res.writeHead(403, {'Content-Type':'text/plain'})
            return res.end('Forbidden')
        }
        res.writeHead(200, {'Content-Type':'application/json'})
        return res.end(JSON.stringify(checkoutData))
    }

// ===== POST UTANG =====
if(req.method === 'POST' && req.url === '/utang'){
    let body = ''
    req.on('data', chunk => body += chunk)
    req.on('end', () => {
        let data
        try {
            data = JSON.parse(body)
        } catch {
            res.writeHead(400, {'Content-Type':'application/json'})
            return res.end(JSON.stringify({success:false, message:'JSON salah'}))
        }

        const { items, nama, keterangan } = data
        if(!items || items.length === 0 || !nama){
            res.writeHead(400, {'Content-Type':'application/json'})
            return res.end(JSON.stringify({success:false, message:'Data utang tidak lengkap'}))
        }

        // kurangi stok hanya untuk barang yang bukan manual
        items.forEach(item => {
            if(item.manual) return; // barang manual tidak kurangi stok
            const produk = products.find(p => String(p.id) === String(item.id))
            if(produk) produk.stok -= item.jumlah
        })
        fs.writeFileSync(dataFile, JSON.stringify(products, null, 2))

        // simpan utang
        const utang = {
            id: Date.now(),
            nama,
            keterangan: keterangan || 'utang',
            cart: items,
            total: items.reduce((sum,i)=>sum+i.harga*i.jumlah,0),
            tanggal: new Date().toISOString()
        }
        utangData.push(utang)
        fs.writeFileSync(utangFile, JSON.stringify(utangData, null, 2))

        res.writeHead(200, {'Content-Type':'application/json'})
        res.end(JSON.stringify({success:true, utang}))
    })
    return
}

// ===== BAYAR UTANG =====
if(req.method === 'POST' && req.url === '/bayar-utang'){
    let body = ''
    req.on('data', chunk => body += chunk)
    req.on('end', () => {
        let data
        try {
            data = JSON.parse(body)
        } catch {
            res.writeHead(400, {'Content-Type':'application/json'})
            return res.end(JSON.stringify({success:false, message:'JSON salah'}))
        }

        let { id, jumlahBayar } = data
        if(!id || !jumlahBayar || jumlahBayar <= 0){
            res.writeHead(400, {'Content-Type':'application/json'})
            return res.end(JSON.stringify({success:false, message:'Data bayar utang tidak valid'}))
        }

        const utang = utangData.find(u => String(u.id) === String(id))
        if(!utang){
            res.writeHead(404, {'Content-Type':'application/json'})
            return res.end(JSON.stringify({success:false, message:'Utang tidak ditemukan'}))
        }

        if(jumlahBayar >= utang.total){
            // lunas → hapus dari utangData
            const index = utangData.indexOf(utang)
            utangData.splice(index,1)
        } else {
            // bayar sebagian → kurangi total
            utang.total -= jumlahBayar
        }

        fs.writeFileSync(utangFile, JSON.stringify(utangData, null, 2))
        res.writeHead(200, {'Content-Type':'application/json'})
        res.end(JSON.stringify({success:true, sisa: utang.total || 0}))
    })
    return
}

// ===== GET DATA UTANG =====
if(req.method === 'GET' && req.url.startsWith('/get-utang')){
    res.writeHead(200, {'Content-Type':'application/json'})
    return res.end(JSON.stringify(utangData))
}
// ===== BAYAR UTANG =====
if(req.method === 'POST' && req.url === '/bayar-utang'){
    let body = ''
    req.on('data', chunk => body += chunk)
    req.on('end', () => {
        let data
        try {
            data = JSON.parse(body)
        } catch {
            res.writeHead(400, {'Content-Type':'application/json'})
            return res.end(JSON.stringify({success:false, message:'JSON salah'}))
        }

        let { id, jumlahBayar } = data
        if(!id || !jumlahBayar || jumlahBayar <= 0){
            res.writeHead(400, {'Content-Type':'application/json'})
            return res.end(JSON.stringify({success:false, message:'Data bayar utang tidak valid'}))
        }

        const utang = utangData.find(u => String(u.id) === String(id))
        if(!utang){
            res.writeHead(404, {'Content-Type':'application/json'})
            return res.end(JSON.stringify({success:false, message:'Utang tidak ditemukan'}))
        }

        if(jumlahBayar >= utang.total){
            // lunas → hapus dari utangData
            const index = utangData.indexOf(utang)
            utangData.splice(index,1)
        } else {
            // bayar sebagian → kurangi total
            utang.total -= jumlahBayar
        }

        fs.writeFileSync(utangFile, JSON.stringify(utangData, null, 2))
        res.writeHead(200, {'Content-Type':'application/json'})
        res.end(JSON.stringify({success:true, sisa: utang.total || 0}))
    })
    return
}

// ===== GET DATA UTANG =====
if(req.method === 'GET' && req.url.startsWith('/get-utang')){
    res.writeHead(200, {'Content-Type':'application/json'})
    return res.end(JSON.stringify(utangData))
}

    // ===== DEFAULT 404 =====
    res.writeHead(404)
    res.end('Not Found 😎')
})

server.listen(PORT, () => {
    console.log(`Server jalan di http://localhost:${PORT}`)
})
