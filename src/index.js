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

const compress = (path) => {
  return new Promise(async (resolve, reject) => {
    const oldBuffer = fs.readFileSync(path)
    const newBuffer = await sharp(oldBuffer).toBuffer()

    fs.writeFileSync(path, newBuffer)

    resolve()
  })
}

const tasks = []

files.forEach((path) => {
  tasks.push(compress(path))
})
