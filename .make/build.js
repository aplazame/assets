
const fs = require('fs')
const path = require('path')
const { promisify } = require('util')

const _glob = require('glob')
const glob = promisify(_glob)

const _sizeOf = require('image-size')
const sizeOf = promisify(_sizeOf)

const template = require('@triskel/template')

template.cmd('cdn', function (expression, scope) {

    var file = this.eval(expression)(scope)
    console.log('url', file)
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

async function writeIndex (cwd) {
  var filepaths = await glob('**/*.{png,svg}', {
    cwd: cwd,
  })
  
  var files = await Promise.all( filepaths.map(async function (filepath) {
    return {
      path: filepath,
      dimensions: await sizeOf( path.join(cwd, filepath) ),
    }
  }) )

  var index_template = await _readTextFile( path.join(__dirname, 'demo/index.html') )
  
  await _whiteTextFile(
    path.join(cwd, 'index.html'),
    template(index_template, {
      cwd: cwd,
      page: {
        title: 'Aplazame | ' + cwd
      },
      files: files,
    })
  )
}

Promise.all([
  writeIndex('logos'),
  glob('banners/*').then( (directories) => Promise.all(directories.map(writeIndex)) )
])
