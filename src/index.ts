import Https from 'https'
import SchemaUtils from 'schema-utils'
import Url from 'url'
import Chalk from 'chalk'
import Figures from 'figures'
import Fs from 'fs'
import Ora from 'ora'
import asyncPool from 'tiny-async-pool'
import { Compiler } from 'webpack'
import { Schema } from 'schema-utils/declarations/validate'

import { PLUGIN_NAME, IMG_REGEXP } from '../util/getting'
import { RandomHeader, computeSize } from '../util/setting'
import request from '../util/https'
import schema from './schema.json'
import { options } from './typing'

const myRequest = request(Https.request)

export default class TinyimgWebpackPlugin {
  private opts: options
  private total = {
    oldSize: 0,
    newSize: 0,
  }
  private startTime: number
  private imgNum: number
  private completeNum: number
  private spinner: Ora.Ora

  constructor(opts: options) {
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

  apply(compiler: Compiler) {
    const { enabled, logged, concurrency = 40 } = this.opts

    SchemaUtils(schema as Schema, this.opts, { name: PLUGIN_NAME })
    enabled &&
      compiler.hooks.emit.tap(PLUGIN_NAME, (compilation) => {
        const imgs = Object.keys(compilation.assets).filter((v) => IMG_REGEXP.test(v))

        if (!imgs.length) {
          return Promise.resolve()
        }

        this.imgNum = imgs.length

        const promise = (path: string) => {
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

  async compressImg(asset: any, path: string, times: number): Promise<string> {
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

  uploadImg(file: any): Promise<any> {
    const opts = RandomHeader()
    opts.timeout = (this.opts.timeout || 1) * 1000

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
        req.on('timeout', (e: string) => reject(e))
        req.end()
      } catch (e) {
        reject(e)
      }
    })
  }

  downloadImg(url: string): Promise<any> {
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
