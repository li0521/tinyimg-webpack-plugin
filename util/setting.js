const { TINYIMG_URL } = require("./getting");

function RandomHeader() {
  const ip = new Array(4)
    .fill(0)
    .map(() => parseInt(Math.random() * 255))
    .join(".");
  const index = Math.round(Math.random());

  return {
    headers: {
      "Cache-Control": "no-cache",
      "Content-Type": "application/x-www-form-urlencoded",
      "Postman-Token": Date.now(),
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36",
      "X-Forwarded-For": ip,
    },
    hostname: TINYIMG_URL[index],
    method: "POST",
    path: "/web/shrink",
    rejectUnauthorized: false,
    timeout: 10000,
  };
}

function computeSize(size) {
  let unit = 0;
  const unitArr = ["b", "Kb", "Mb", "Tb"];

  while (size > 1024) {
    size /= 1024;
    unit++;
  }

  return `${size.toFixed(2)}${unitArr[unit]}`;
}

module.exports = {
  RandomHeader,
  computeSize,
};
