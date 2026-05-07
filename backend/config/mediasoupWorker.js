const mediasoup = require("mediasoup");
const config = require("./mediasoup");

let worker;

async function getWorker() {
  if (!worker) {
    worker = await mediasoup.createWorker(config.worker);
    worker.on("died", () => {
      console.error("MediaSoup worker died, restarting...");
      setTimeout(getWorker, 2000);
    });
    console.log("MediaSoup worker created");
  }
  return worker;
}

module.exports = { getWorker };