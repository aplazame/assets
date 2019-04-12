
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

var build = {
  time: Date.now(),
}

template.cmd('build', function (expression) {

  return build[expression.trim()]

}, true)

function _readTextFile (filepath) {
    return new Promise(function (resolve, reject) {
        fs.readFile( path.join(__dirname, filepath), 'utf8', function (err, data) {
            if( err ) return reject(err)
            resolve(String(data))
        })
    })
}

async function _loadTemplate(filepath) {
  var code = await _readTextFile(filepath)
  return template(code)
  // return (function (render) {
  //   return function (data, target) {
  //     console.log('rendering', filepath, 'to', target)
  //     return render(data)
  //   }
  // })( template(code) )
}

function _whiteTextFile (filepath, data) {
    return new Promise(function (resolve, reject) {
        fs.writeFile(filepath, data, { encoding: 'utf8' }, function (err, data) {
            if( err ) return reject(err)
            resolve(String(data))
        })
    })
}

function _getBreadcrumb (cwd) {
  return ('assets/' + cwd).split('/').reduce(function(breadcrumb, slug, i, list) {
    breadcrumb.push({
      href: 
        i + 1 < list.length
          ? (breadcrumb[i - 1] ? (breadcrumb[i - 1].href + slug + '/') : BASE_HREF)
          : null
        ,
      label: slug[0].toUpperCase() + slug.substr(1),
    })
    return breadcrumb
  }, [])
}

async function writeImagesTable (cwd) {
  console.log('writeImagesTable', cwd)

  var filepaths = await glob('**/*.{png,svg}', {
    cwd: cwd,
  }),
  num_files = 0
  
  var files = await Promise.all( filepaths.map(async function (filepath) {
    num_files++
    return {
      path: filepath,
      fullpath: BASE_HREF + path.join(cwd, filepath),
      dimensions: await sizeOf( path.join(cwd, filepath) ),
    }
  }) )

  console.log(`\nnum_files in '${ cwd }': ${ num_files }\n`)

  let [renderIndex, renderTable, renderMD] = await Promise.all([
    'demo/images-index.html',
    'demo/images-table.html',
    'demo/images-table.md',
  ].map(_loadTemplate) )
  
  await _whiteTextFile(
    path.join(cwd, 'README.md'),
    renderMD({ cwd, files })
  )

  await _whiteTextFile(
    path.join(cwd, 'index.html'),
    renderIndex({
      cwd,
      breadcrumb: _getBreadcrumb(cwd),
      page: {
        BASE_HREF,
        CSS_BASE,
        title: 'Aplazame | ' + cwd,
        main: renderTable({ cwd, files }),
      },
    })
  )
}

async function writeIndex () {
  var renderIndex = await _loadTemplate('demo/images-index.html')
  var readme_md = await _readTextFile('../README.md')
  
  await _whiteTextFile(
    path.join(__dirname, '../index.html'),
    renderIndex({
      page: {
        BASE_HREF,
        CSS_BASE,
        title: 'Aplazame | Assets',
        main: marked(readme_md),
        body_class: '_md-index',
      },
    })
  )
}

async function writeBannersIndex () {
  var renderIndex = await _loadTemplate('demo/images-index.html')
  var readme_md = await _readTextFile('../banners/README.md')
  
  await _whiteTextFile(
    path.join(__dirname, '../banners/index.html'),
    renderIndex({
      breadcrumb: [
        { href: BASE_HREF, label: 'Assets' },
        { label: 'Banners' },
      ],
      page: {
        BASE_HREF: BASE_HREF + 'banners/',
        CSS_BASE,
        title: 'Aplazame | Banners',
        main: marked(readme_md),
        body_class: '_md-index',
      },
    })
  )
}

Promise.all([
  writeImagesTable('logos'),
  glob('banners/*', { ignore: '{,**/}*.{html,md}' }).then( (directories) =>
    Promise.all(directories.map(writeImagesTable))
  ),
  writeIndex(),
  writeBannersIndex(),
])
