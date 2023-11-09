#!/usr/bin/env node

const { spawnSync, execSync } = require('child_process')
const fs = require('fs')
const sharp = require('sharp')

// 跳过合并
const status = execSync('git status', {
  encoding: 'utf-8',
})

if (/merge|合并/i.test(status.split('\n'))) {
  process.exit(0)
}

const args = process.argv.slice(2)

// 过滤图片
const files = args.filter((file) => /\.(png|jpg|jpeg)$/.test(file))
if (files.length === 0) {
  process.exit(0)
}

//  Stream 转 Buffer
// const streamToBuffer = (stream) =>
//   new Promise((resolve, reject) => {
//     const buffers = []
//     stream.on('error', reject)
//     stream.on('data', (data) => buffers.push(data))
//     stream.on('end', () => resolve(Buffer.concat(buffers)))
//   })

// // Buffer 转 Stream
// const bufferToStream = (buffer) => {
//   const stream = new Duplex()
//   stream.push(buffer)
//   stream.push(null)
//   return stream
// }

const compress = (path) => {
  return new Promise(async (resolve, reject) => {
    const newBuffer = await sharp(path).toBuffer()

    fs.writeFileSync(path, newBuffer)

    resolve()
  })
}

const tasks = []

files.forEach((path) => {
  tasks.push(compress(path))
})

Promise.all(tasks).then(() => {
  console.log('压缩完成')
  const { status } = spawnSync('git', ['add', ...files])
  process.exit(status)
})
