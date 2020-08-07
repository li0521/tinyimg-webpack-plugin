module.exports = {
  request: function (_request) {
    return function (options, callback) {
      const timeout = options["timeout"];
      let timeoutEventId;

      const req = _request(options, function (res) {
        res.on("end", function () {
          clearTimeout(timeoutEventId);
        });

        res.on("close", function () {
          clearTimeout(timeoutEventId);
        });

        res.on("abort", function () {});

        callback(res);
      });

      req.on("timeout", function () {
        req.res && req.res.abort();
        req.abort();
      });

      timeout &&
        (timeoutEventId = setTimeout(function () {
          req.emit("timeout", "Timeout");
        }, timeout));
      return req;
    };
  },
};
