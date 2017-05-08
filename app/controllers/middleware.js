var memjs = require('memjs')
var client = memjs.Client.create()

var cache = (timeout) => {
  return (req, res, next) => {
    let key = '__express__' + req.originalUrl || req.url
    client.get(key, (err, cachedBody) => {
      if (cachedBody) {
        res.send(cachedBody)
        return
      } else {
        res.sendResponse = res.send
        res.send = (body) => {
          client.set(key, body, {expires:timeout});
          res.sendResponse(body)
        }
        next()
      }
    })
  }
}

exports.cache = cache