import dgram from 'node:dgram';


async function main() {
    const socket = dgram.createSocket("udp4");

    socket.on('error', console.error);

    socket.on('message', (msg, remoteInfo) => {
        console.log(`Got message ${msg} from ${remoteInfo.address}:${remoteInfo.port}`);
    });

    socket.on('listening', () => {
        const address = socket.address();
        console.log(`Listening on ${address.address}:${address.port}`);
    });

    socket.bind(5555);
}

main().catch(console.error);
