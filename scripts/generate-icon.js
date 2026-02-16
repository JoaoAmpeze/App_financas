const fs = require('fs')
const path = require('path')

// Ícone de carteira em SVG (cor sólida para renderizar bem no .ico)
const walletSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/>
  <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>
</svg>`

async function main() {
  let sharp, toIco
  try {
    sharp = require('sharp')
    toIco = require('to-ico')
  } catch (e) {
    console.error('Instale as dependências: npm install -D sharp to-ico')
    process.exit(1)
  }

  const buildDir = path.join(__dirname, '..', 'build')
  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true })
  }

  const sizes = [256, 48, 32, 16]
  const buffers = await Promise.all(
    sizes.map((size) =>
      sharp(Buffer.from(walletSvg))
        .resize(size, size)
        .png()
        .toBuffer()
    )
  )

  const ico = await toIco(buffers)
  fs.writeFileSync(path.join(buildDir, 'icon.ico'), ico)
  console.log('build/icon.ico gerado com sucesso.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
