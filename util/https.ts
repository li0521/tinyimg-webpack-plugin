import * as tls from 'tls'
import * as http from 'http'

type RequestOptions = http.RequestOptions &
  tls.SecureContextOptions & {
    rejectUnauthorized?: boolean // Defaults to true
    servername?: string // SNI TLS Extension
  }

type Request = (
  options: RequestOptions | string | URL,
  callback?: (res: http.IncomingMessage) => void
) => http.ClientRequest

export default function request(_request: Request) {
  return function (options: RequestOptions, callback: (res: http.IncomingMessage) => void) {
    const timeout = options['timeout']
    let timeoutEventId: NodeJS.Timeout

    const req = _request(options, function (res) {
      res.on('end', function () {
        clearTimeout(timeoutEventId)
      })

      res.on('close', function () {
        clearTimeout(timeoutEventId)
      })

      res.on('abort', function () {})

      callback(res)
    })

    req.on('timeout', function () {
      req.abort()
    })

    timeout &&
      (timeoutEventId = setTimeout(function () {
        req.emit('timeout', 'Timeout')
      }, timeout))
    return req
  }
}
