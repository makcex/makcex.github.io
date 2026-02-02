const http = require('http')
const fs = require('fs')
const path = require('path')
const PORT = process.env.PORT || 3000;

const products = []
  
const dataFile = path.join(__dirname, 'products.json')

// Load data produk saat server mulai
if (fs.existsSync(dataFile)) {
    try {
        const raw = fs.readFileSync(dataFile)
        const jsonData = JSON.parse(raw)
        products.push(...jsonData)
    } catch(err) {
        console.error('Gagal membaca products.json', err)
    }
}


const routes = {
    '/': '/dashboard.html',
    '/dashboard': '/dashboard.html',
    '/adm1n': '/admin.html'
}

const server = http.createServer((req, res) => {

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


   if (req.url.startsWith('/img/')) {
    const imgPath = path.join(__dirname, 'img', path.basename(req.url))

    fs.readFile(imgPath, (err, data) => {
        if (err) {
            res.writeHead(404)
            return res.end('Gambar tidak ditemukan')
        }

        const ext = path.extname(imgPath)
        const mimeTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png'
        }

        res.writeHead(200, {
            'Content-Type': mimeTypes[ext] || 'application/octet-stream'
        })
        res.end(data)
    })
    return
}



    const page = routes[req.url]
    if(page) {
        fs.readFile(path.join(__dirname,page), (err, data) => {
            if(err) {
                res.writeHead(500)
                return res.end('padem somon')
            }
            res.writeHead(200, {'Content-Type': 'text/html'})
            res.end(data)
        })
        return
    }

    if(req.method === 'GET' && req.url === '/products') {
        res.writeHead(200, {'Content-Type': 'application/json'})
        return res.end(JSON.stringify(products))    
    }

    if(req.method === 'POST' && req.url === '/products') {
        let body = ''

        req.on('data', chunk => body += chunk)
        req.on('end', () => {
            let nilai =''
            try {
                nilai = JSON.parse(body)
            }catch {
                res.writeHead(400)
                return res.end('json tidak valid')
            }
            const data = nilai
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

            res.writeHead(201, {"Content-Type": "application/json"})
            res.end(JSON.stringify({success: true, produk: produkBaru}))
        })
        return
    }

    const { formidable } = require('formidable')

if (req.method === 'POST' && req.url === '/upload') {

    if (!fs.existsSync('img')) {
        fs.mkdirSync('img')
    }

    const form = formidable({
        uploadDir: path.join(__dirname, 'img'),
        keepExtensions: true
    })

    form.parse(req, (err, fields, files) => {
        if (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' })
            return res.end(JSON.stringify({
                success: false,
                message: err.message
            }))
        }

        if (!files.img) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            return res.end(JSON.stringify({
                success: false,
                message: 'File img tidak ditemukan'
            }))
        }

        const file = Array.isArray(files.img) ? files.img[0] : files.img
        const fileName = path.basename(file.filepath)

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({
            success: true,
            fileName
        }))
    })
    return
}


    res.writeHead(404)
    res.end('Botong Tun Udi Dew O')
})
server.listen(PORT, () => {
    console.log(`server jalan di loclhost ${PORT} di jalan Desa Perbo`)
})