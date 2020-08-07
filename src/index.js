const Https = require('https')
const SchemaUtils = require('schema-utils')
const Url = require('url')
const Chalk = require('chalk')
const Figures = require('figures')
const Fs = require('fs')
const Ora = require('ora')
const asyncPool = require('tiny-async-pool')

const { PLUGIN_NAME, IMG_REGEXP } = require('../util/getting')
const { RandomHeader, computeSize } = require('../util/setting')
const { request } = require('../util/https')
const Schema = require('./schema')

const myRequest = request(Https.request)

module.exports = class TinyimgWebpackPlugin {
  constructor(opts) {
    this.opts = opts
    this.total = {
      oldSize: 0,
      newSize: 0,
    }
    this.startTime = new Date().getTime()
    this.imgNum = 0
    this.completeNum = 0
    this.spinner = Ora(`图片压缩完成 (${this.completeNum}/${this.imgNum})`).start()
  }

  apply(compiler) {
    const { enabled, logged, concurrency = 40 } = this.opts

    SchemaUtils(Schema, this.opts, { name: PLUGIN_NAME })
    enabled &&
      compiler.hooks.emit.tap(PLUGIN_NAME, (compilation) => {
        const imgs = Object.keys(compilation.assets).filter((v) => IMG_REGEXP.test(v))

        if (!imgs.length) {
          return Promise.resolve()
        }

        this.imgNum = imgs.length

        const promise = (path) => {
          return this.compressImg(compilation.assets[path], path, 0)
        }

        return asyncPool(concurrency, imgs, promise).then((res) => {
          const endTime = new Date().getTime()

          this.spinner.stop()
          logged && res.forEach((v) => console.log(v))

          console.log(
            `成功: ${Chalk.greenBright(this.completeNum)}张 失败: ${Chalk.redBright(
              this.imgNum - this.completeNum
            )}张`
          )
          console.log(
            `图片资源总大小: ${Chalk.redBright(
              computeSize(this.total.oldSize)
            )} 压缩后图片资源总大小: ${Chalk.greenBright(
              computeSize(this.total.newSize)
            )} 体积减少: ${Chalk.yellowBright(
              (((this.total.oldSize - this.total.newSize) / this.total.oldSize) * 100).toFixed(2)
            )}% 耗时: ${(endTime - this.startTime) / 1000}s`
          )
        })
      })
  }

  async compressImg(asset, path, times) {
    try {
      const file = asset.source()
      const obj = await this.uploadImg(file)
      const data = await this.downloadImg(obj.output.url)
      const oldSize = Chalk.redBright(computeSize(obj.input.size))
      const newSize = Chalk.greenBright(computeSize(obj.output.size))
      const dpath = asset.existsAt
      const msg = `${Figures.tick} 压缩图片[${Chalk.yellowBright(
        path
      )}]完成: 压缩前大小 ${oldSize}, 压缩后大小 ${newSize}`

      Fs.writeFileSync(dpath, data, 'binary')

      this.total.oldSize += obj.input.size
      this.total.newSize += obj.output.size
      this.completeNum++
      this.spinner.text = `图片压缩完成 (${this.completeNum}/${this.imgNum})`

      return Promise.resolve(msg)
    } catch (err) {
      console.log(
        `\n压缩图片[${Chalk.yellowBright(path)}] 失败: ${Chalk.redBright(err)} 正在重试...`
      )
      if (times > 2) {
        const msg = `${Figures.cross} 压缩图片[${Chalk.yellowBright(path)}]失败`
        return Promise.resolve(msg)
      } else {
        return this.compressImg(asset, path, times + 1)
      }
    }
  }

  uploadImg(file) {
    const opts = RandomHeader()
    opts.timeout = this.opts.timeout * 1000

    return new Promise((resolve, reject) => {
      try {
        const req = myRequest(opts, (res) =>
          res.on('data', (data) => {
            const obj = JSON.parse(data.toString())
            obj.error ? reject(obj.message) : resolve(obj)
          })
        )

        req.write(file, 'binary')
        req.on('error', (e) => reject(e))
        req.on('timeout', (e) => reject(e))
        req.end()
      } catch (e) {
        reject(e)
      }
    })
  }

  downloadImg(url) {
    const opts = new Url.URL(url)

    return new Promise((resolve, reject) => {
      const req = myRequest(opts, (res) => {
        let file = ''

        res.setEncoding('binary')
        res.on('data', (chunk) => (file += chunk))
        res.on('end', () => resolve(file))
      })

      req.on('error', (e) => reject(e))
      req.end()
    })
  }
}
