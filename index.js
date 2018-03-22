const commands = require('redis-commands')

module.exports = function (jcachePath) {
  const jcache = require(jcachePath)

  class JcacheWrapper {
    constructor (options) {
      this.client = new jcache.RAccess(options.id, options.name)
    }
  }

  commands.list.forEach(command => {
    JcacheWrapper.prototype[command] = function (...argvs) {
      const indexes = commands.getKeyIndexes(command, argvs)
      const cmd = new jcache.RCommand()
      cmd.Arg(0, command)

      argvs.forEach((argv, i) => cmd.Arg(i + 1, argv))
      indexes.forEach(index => cmd.Key(index + 1))

      const self = this
      return new Promise(function (resolve, reject) {
        self.client.Query(cmd, function (code, msg, data) {
          if (code < 0) {
            reject(new Error(`Jcache error: ${msg}`))
          } else {
            let result = data.length > 1 ? data : data[0]

            // ["v1", "1", "v2", "2", "v3", "3"] -> {"v1": "1", "v2": "2", "v3": "3"}
            if (command === 'hgetall') {
              const t = {}
              result = result && result.forEach((r, i) => {
                if (i % 2 === 0) {
                  t[r] = ''
                } else {
                  t[result[i - 1]] = r
                }
              })
              result = t
            }

            resolve(result)
          }
        })
      })
    }
  })

  return JcacheWrapper
}
