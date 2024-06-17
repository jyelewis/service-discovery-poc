import dgram from 'node:dgram';


async function main() {
    const socket = dgram.createSocket("udp4");

    socket.on('error', console.error);

    socket.on('message', (msg, remoteInfo) => {
        console.log(`Got message ${msg} from ${remoteInfo.address}:${remoteInfo.port}`);
    });

    socket.on('listening', () => {
        socket.setBroadcast(true);

        setInterval(() => {
            const msg = 'Hello world';
            socket.send(msg, 0, msg.length, 5555, '255.255.255.255');
        }, 1000);

        const address = socket.address();
        console.log(`Listening on ${address.address}:${address.port}`);
    });

    // why this different port?
    socket.bind(8888);
}

main().catch(console.error);
