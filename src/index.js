#!/usr/bin/env node

const { spawnSync, execSync } = require('child_process')
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

// Stream 转 Buffer
const streamToBuffer = (stream) =>
  new Promise((resolve, reject) => {
    const buffers = []
    stream.on('error', reject)
    stream.on('data', (data) => buffers.push(data))
    stream.on('end', () => resolve(Buffer.concat(buffers)))
  })

// Buffer 转 Stream
const bufferToStream = (buffer) => {
  const stream = new Duplex()
  stream.push(buffer)
  stream.push(null)
  return stream
}

const compress = async (stream) => {
  const imagesBuffer = await streamToBuffer(stream)
  const metadata = await sharp(imagesBuffer).metadata()

  let formatOptions = { quality: 75 }

  // 压缩: 调用 sharp
  const newBuffer = await sharp(imagesBuffer)?.[metadata.format](formatOptions).toBuffer()

  // 返回文件流
  return bufferToStream(newBuffer)
}

const tasks = []

files.forEach((path) => {
  tasks.push(sharp(path).toFile('2.jpg'))
})

Promise.all(tasks).then(() => {
  const { status } = spawnSync('git', ['add', ...files])
  process.exit(status)
})
