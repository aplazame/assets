
require('dotenv').config()

const fs = require('fs')
const path = require('path')
const { promisify } = require('util')

const _glob = require('glob')
const glob = promisify(_glob)

const _sizeOf = require('image-size')
const sizeOf = promisify(_sizeOf)

const template = require('@triskel/template')
const marked = require('marked')

const BASE_HREF = process.env.BASE_HREF || 'https://cdn.aplazame.com/assets/'
const CSS_BASE = process.env.CSS_BASE || '/assets/'

console.log('BASE_HREF', BASE_HREF)

template.cmd('cdn', function (expression, scope) {

    var file = this.eval(expression)(scope)
    // console.log('url', file)
    return 'https://' + path.join('cdn.aplazame.com/assets', scope.cwd, file.path)

}, true)

function _readTextFile (filepath) {
    return new Promise(function (resolve, reject) {
        fs.readFile(filepath, 'utf8', function (err, data) {
            if( err ) return reject(err)
            resolve(String(data))
        })
    })
}
function _whiteTextFile (filepath, data) {
    return new Promise(function (resolve, reject) {
        fs.writeFile(filepath, data, { encoding: 'utf8' }, function (err, data) {
            if( err ) return reject(err)
            resolve(String(data))
        })
    })
}

async function writeImagesTable (cwd) {
  var filepaths = await glob('**/*.{png,svg}', {
    cwd: cwd,
  }),
  num_files = 0
  
  var files = await Promise.all( filepaths.map(async function (filepath) {
    num_files++
    return {
      path: filepath,
      dimensions: await sizeOf( path.join(cwd, filepath) ),
    }
  }) )

  console.log(`\nnum_files in '${ cwd }': ${ num_files }\n`)

  var index_template = await _readTextFile( path.join(__dirname, 'demo/images-table.html') )
  var index_template_md = await _readTextFile( path.join(__dirname, 'demo/images-table.md') )
  
  await _whiteTextFile(
    path.join(cwd, 'README.md'),
    template(index_template_md, {
      cwd: cwd,
      files: files,
    })
  )

  await _whiteTextFile(
    path.join(cwd, 'index.html'),
    template(index_template, {
      cwd: cwd,
      page: {
        BASE_HREF,
        CSS_BASE,
        title: 'Aplazame | ' + cwd,
      },
      files: files.map(function (file) {
        file.path = BASE_HREF + path.join(cwd, file.path)
        return file
      }),
    })
  )
}

async function writeIndex () {
  var index_template = await _readTextFile( path.join(__dirname, 'demo/images-index.html') )
  var readme_md = await _readTextFile( path.join(__dirname, '../README.md') )
  
  await _whiteTextFile(
    path.join(__dirname, '../index.html'),
    template(index_template, {
      page: {
        BASE_HREF,
        CSS_BASE,
        title: 'Aplazame | Assets',
        body: marked(readme_md),
        body_class: '_md-index',
      },
    })
  )
}

Promise.all([
  writeImagesTable('logos'),
  glob('banners/*').then( (directories) => Promise.all(directories.map(writeImagesTable)) ),
  writeIndex(),
])
