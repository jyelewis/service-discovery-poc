
// send message via UDP broadcast on startup & every second
// send disconnect message?
// each client keeps a list of known devices & their status
//  - ip address
//  - hostname
//  - platform
//  - free memory
//  - last update (cull items more than n seconds old)

import dgram from "node:dgram";
import os from 'node:os';

const COLLENGTH = 20;

interface Device {
    ipAddress: string;
    hostname: string;
    platform: NodeJS.Platform;
    freeMemoryMb: number;

    lastUpdate: number;
}

const neighbourDevices = new Map<string, Device>(); // mapped by IP Address

function fmtRow(msgs: string[]): string {
    return msgs.map(msg => msg.padEnd(COLLENGTH, ' ')).join('| ');
}

async function displayNeighbourDevices() {
    setInterval(() => {
        // clear the terminal
        console.log('\x1b[2J');

        // filter down to devices we've seen in hte past 5 seconds
        const lastUpdateCutOff = Date.now() - (1000 * 5); // 5 seconds ago
        const connectedNeighbourDevices = Array.from(neighbourDevices.values()).filter(device => device.lastUpdate > lastUpdateCutOff);

        // sort by IP address to avoid devices jumping around
        connectedNeighbourDevices.sort((a, b) => a.ipAddress.localeCompare(b.ipAddress));

        console.log(fmtRow(['IP Address', 'Hostname', 'Platform', 'Free Memory (MB)']));
        console.log(fmtRow(['-------------------', '-------------------', '-------------------', '-------------------']));
        for (const connectedNeighbourDevice of connectedNeighbourDevices) {
            console.log(fmtRow([
                connectedNeighbourDevice.ipAddress,
                connectedNeighbourDevice.hostname,
                connectedNeighbourDevice.platform,
                connectedNeighbourDevice.freeMemoryMb.toString()
            ]));
        }
    }, 100);
}

async function runDiscoveryServer() {
    const socket = dgram.createSocket("udp4");

    socket.on('error', console.error);

    socket.on('message', (msg, remoteInfo) => {
        const remoteDevice: Device = JSON.parse(msg.toString());

        // always use the networking stack IP
        remoteDevice.ipAddress = remoteInfo.address;

        // store device info
        neighbourDevices.set(remoteDevice.ipAddress, remoteDevice);
    });

    socket.on('listening', () => {
        socket.setBroadcast(true);

        setInterval(() => {
            const selfDevice: Device = {
                ipAddress: '0.0.0.0',
                freeMemoryMb: Math.floor(os.freemem() / (1024*1024)),
                platform: os.platform(),
                hostname: os.hostname(),
                lastUpdate: Date.now()
            }

            const msg = JSON.stringify(selfDevice);
            socket.send(msg, 0, msg.length, 42069, '255.255.255.255');
        }, 1000);
    });

    socket.bind(42069);
}

runDiscoveryServer().catch(console.error);
displayNeighbourDevices().catch(console.error);