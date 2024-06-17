import dgram from "node:dgram";
import os from "node:os";

// send 'Device' message via UDP broadcast every second
// each client keeps a list of known devices & their status
interface Device {
  ipAddress: string;
  hostname: string;
  platform: NodeJS.Platform;
  freeMemoryMb: number;

  lastUpdate: number;
}

// keep a local database of known devices
const neighbourDevices = new Map<string, Device>(); // mapped by IP Address

// broadcast device status to others while listening for other device broadcasts
async function runDiscoveryServer() {
  const socket = dgram.createSocket("udp4");

  socket.on("message", (msg, remoteInfo) => {
    // parse the remote message into a 'Device'
    const remoteDevice: Device = JSON.parse(msg.toString());

    // always use the networking stack IP
    remoteDevice.ipAddress = remoteInfo.address;

    // store device info
    neighbourDevices.set(remoteDevice.ipAddress, remoteDevice);
  });

  socket.on("listening", () => {
    socket.setBroadcast(true);

    // start sending device update packets every second
    setInterval(() => {
      const selfDevice: Device = {
        ipAddress: "0.0.0.0",
        freeMemoryMb: Math.floor(os.freemem() / (1024 * 1024)),
        platform: os.platform(),
        hostname: os.hostname(),
        lastUpdate: Date.now(),
      };

      const msg = JSON.stringify(selfDevice);
      socket.send(msg, 0, msg.length, 42069, "255.255.255.255");
    }, 1000);
  });

  socket.bind(42069);
}

// display currently known devices in a table view, continuously refresh
async function displayNeighbourDevices() {
  setInterval(() => {
    // clear the terminal
    console.log("\x1b[2J");

    // filter down to devices we've seen in the past 3 seconds
    const lastUpdateCutOff = Date.now() - 1000 * 3;
    const connectedNeighbourDevices = Array.from(
      neighbourDevices.values(),
    ).filter((device) => device.lastUpdate > lastUpdateCutOff);

    // sort by IP address to avoid devices jumping around
    connectedNeighbourDevices.sort((a, b) =>
      a.ipAddress.localeCompare(b.ipAddress),
    );

    // print our nice table
    const fmtRow = (msgs: string[]): string =>
      msgs.map((msg) => msg.padEnd(20, " ")).join("| ");

    console.log(
      fmtRow(["IP Address", "Hostname", "Platform", "Free Memory (MB)"]),
    );
    console.log("-".repeat(82));

    for (const connectedNeighbourDevice of connectedNeighbourDevices) {
      console.log(
        fmtRow([
          connectedNeighbourDevice.ipAddress,
          connectedNeighbourDevice.hostname,
          connectedNeighbourDevice.platform,
          connectedNeighbourDevice.freeMemoryMb.toString(),
        ]),
      );
    }
  }, 100);
}

runDiscoveryServer().catch(console.error);
displayNeighbourDevices().catch(console.error);
