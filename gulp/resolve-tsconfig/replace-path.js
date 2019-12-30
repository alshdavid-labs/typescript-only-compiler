const fs = require("fs")
const path = require("path")


// const dumbImportRegex = new RegExp(/(require|import|export)(.*)('|")(.*)(.|\/)+(.*)('|")\)?;?/g)
const betweenQuotesRegex = new RegExp(/('|")(.*)(.|\/)+(.*)('|")/)
const requireRegex = new RegExp(/require\(('|')(.*)('|')\)/g)
const patternImportRegex = new RegExp(
  /(import|export)(?:["'\s]*([\w*${}\n\r\t, ]+)from\s*)?["'\s]["'\s](.*[@\w_-]+)["'\s].*;?$/,
  "mg"
)
const patternDImportRegex = new RegExp(
  /import\((?:["'\s]*([\w*{}\n\r\t, ]+)\s*)?["'\s](.*([@\w_-]+))["'\s].*\);?$/,
  "mg"
)

const appendFileExtension = (target, extension) => {
  const targetArr = target.split('')
  const lastToken = targetArr.pop()
  return [ ...targetArr, ...extension.split(''), lastToken].join('')
}

module.exports = function(code, filePath, tsconfig) {
  const postProcessing = tsconfig.postProcessing
  const importOptions = tsconfig.compilerOptions
  const tscPaths = Object.keys(importOptions.paths || {})
  const lines = code.split("\n")

  return lines
    .map(line => {
      const requireMatches = line.match(requireRegex)
      const patternImport = line.match(patternImportRegex)
      const patternDImport = line.match(patternDImportRegex)
      const hasMatch = requireMatches || patternImport || patternDImport

      if (!hasMatch) {
        return line
      }

      const sourcePath = path.dirname(filePath)

      for (const tscPath of tscPaths) {
        const requiredModules = line.match(new RegExp(tscPath, "g"))
        if (!requiredModules || requiredModules.length === 0) {
          continue
        }
        for (const _requiredModule of requiredModules) {
          const isNodeModule = path.resolve("./node_modules/" + tscPath)
          if (fs.existsSync(isNodeModule)) {
            continue
          }
          if (postProcessing.resolvePaths) {
            const parsedTSPath = path.resolve(importOptions.baseUrl, importOptions.paths[tscPath][0])
            const targetPathDir = path.dirname(parsedTSPath)
            const relativePath = path.relative(sourcePath, targetPathDir)
            const r = new RegExp(tscPath, "g")
            if (relativePath) {
              line = line.replace(r, `./${relativePath}/`)
            } else {
              line = line.replace(r, `./${relativePath}`)
            }
          }
        }
      }
      if (postProcessing.appendModuleExtension) {
        line = line.replace(betweenQuotesRegex, location => {
          const tsModule = appendFileExtension(location, '.ts')
          const jsModule = appendFileExtension(location, '.js')
          if (fs.existsSync(path.resolve(sourcePath, tsModule.slice(1,-1)))) {
            return jsModule
          }
          if (fs.existsSync(path.resolve(sourcePath, jsModule.slice(1,-1)))) {
            return jsModule
          }
          return location
        })
      }
      return line
    })
    .join("\n")
}
