import './index.css'
const { SyncHook } = require('tapable')

class Compiler {
  constructor(options) {
    this.hooks = {
      syncHook: new SyncHook(['name', 'age']),
    }
    let plugins = options.plugins
    if (plugins && plugins.length > 0) {
      plugins.forEach((plugin) => plugin.apply(this))
    }
  }
  run() {
    console.log('开始执行了---------')
    this.syncHookCall('li', 23)
  }
  syncHookCall(name, age) {
    this.hooks.syncHook.call(name, age)
  }
}

class MyPlugin {
  constructor() {}
  apply(compiler) {
    compiler.hooks.syncHook.tap('eventName1', (name, age) => {
      console.log(`eventName1：${name} ${age}`)
    })
  }
}

const options = {
  plugins: [new MyPlugin()],
}

const compiler = new Compiler(options)
compiler.run()
