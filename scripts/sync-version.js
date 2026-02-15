const fs = require('fs')
const path = require('path')

const pkgPath = path.join(__dirname, '..', 'package.json')
const versionPath = path.join(__dirname, '..', 'version.json')

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
const version = JSON.parse(fs.readFileSync(versionPath, 'utf-8'))

version.latestVersion = pkg.version
fs.writeFileSync(versionPath, JSON.stringify(version, null, 2) + '\n')
console.log('version.json atualizado: latestVersion =', pkg.version)
